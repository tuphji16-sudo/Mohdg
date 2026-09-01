package com.ai.studio.arabic.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.util.Base64
import android.util.Log
import com.ai.studio.arabic.BuildConfig
import com.ai.studio.arabic.data.config.GeminiConfig
import com.ai.studio.arabic.data.local.UserPreferences
import com.ai.studio.arabic.data.models.ReasoningMode
import com.ai.studio.arabic.data.models.SceneItem
import com.ai.studio.arabic.data.models.StoryboardItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.UUID
import java.util.concurrent.TimeUnit

class GeminiRepository(private val context: Context? = null) {

    companion object {
        private const val TAG = "GeminiRepository"
    }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(GeminiConfig.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(GeminiConfig.READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(GeminiConfig.WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    // Concurrency control: Mutex prevents multiple overlapping requests from bursting the API
    private val requestMutex = Mutex()

    // Dynamically discovered and verified active model
    @Volatile
    private var verifiedActiveModel: String? = null

    // Track rate-limit cooldown timestamp
    @Volatile
    private var rateLimitCooldownUntil: Long = 0L

    fun getApiKey(): String {
        val customKey = UserPreferences.getApiKey(context)
        if (customKey.isNotBlank()) {
            return customKey.trim()
        }
        return BuildConfig.GEMINI_API_KEY.trim()
    }

    /**
     * Discovers currently supported models via Gemini REST ListModels endpoint.
     * Filters for generateContent support.
     */
    suspend fun discoverAvailableModels(): List<String> = withContext(Dispatchers.IO) {
        val apiKey = getApiKey()
        if (apiKey.isBlank()) {
            return@withContext GeminiConfig.FALLBACK_MODELS
        }

        try {
            val url = "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey"
            val request = Request.Builder().url(url).get().build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (!response.isSuccessful || responseBody.isBlank()) {
                Log.w(TAG, "ListModels request returned HTTP ${response.code}")
                return@withContext GeminiConfig.FALLBACK_MODELS
            }

            val json = JSONObject(responseBody)
            val modelsArray = json.optJSONArray("models") ?: return@withContext GeminiConfig.FALLBACK_MODELS
            val suitableModels = mutableListOf<String>()

            for (i in 0 until modelsArray.length()) {
                val modelObj = modelsArray.getJSONObject(i)
                val rawName = modelObj.optString("name", "")
                val cleanName = rawName.removePrefix("models/")
                val supportedMethods = modelObj.optJSONArray("supportedGenerationMethods")

                var supportsGenerateContent = false
                if (supportedMethods != null) {
                    for (j in 0 until supportedMethods.length()) {
                        if (supportedMethods.optString(j) == "generateContent") {
                            supportsGenerateContent = true
                            break
                        }
                    }
                }

                if (supportsGenerateContent && cleanName.isNotBlank()) {
                    suitableModels.add(cleanName)
                }
            }

            if (suitableModels.isNotEmpty()) {
                val sorted = suitableModels.sortedWith(
                    compareBy { model ->
                        val index = GeminiConfig.FALLBACK_MODELS.indexOfFirst { candidate ->
                            model.equals(candidate, ignoreCase = true) || model.startsWith(candidate, ignoreCase = true)
                        }
                        if (index >= 0) index else 999
                    }
                )
                verifiedActiveModel = sorted.first()
                Log.d(TAG, "Discovered active model: ${sorted.first()}")
                sorted
            } else {
                GeminiConfig.FALLBACK_MODELS
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to discover models: ${e.message}")
            GeminiConfig.FALLBACK_MODELS
        }
    }

    private suspend fun getCandidateModels(): List<String> {
        val cached = verifiedActiveModel
        if (cached != null) {
            return listOf(cached) + GeminiConfig.FALLBACK_MODELS.filter { it != cached }
        }
        return GeminiConfig.FALLBACK_MODELS
    }

    /**
     * Sanitizes and builds the `contents` JSON array for Gemini REST generateContent API.
     * Rules enforced:
     * 1. The first turn MUST have role 'user' (removes any leading 'model' greetings).
     * 2. Roles must strictly alternate (user -> model -> user -> model).
     * 3. Prevents duplicating the current prompt if it was already included in history.
     * 4. Multi-modal attachments (images) are properly encoded as inlineData.
     */
    private fun buildContentsJsonArray(
        prompt: String,
        imageBitmap: Bitmap?,
        history: List<Pair<String, Boolean>>
    ): JSONArray {
        val contentsArray = JSONArray()

        // 1. Clean history to get only past valid turns (excluding current prompt if duplicated at end)
        var pastHistory = history.filter { it.first.isNotBlank() }
        if (pastHistory.isNotEmpty() && pastHistory.last().second && pastHistory.last().first.trim() == prompt.trim()) {
            pastHistory = pastHistory.dropLast(1)
        }

        // 2. Skip any leading 'model' messages (Gemini requires first turn to be 'user')
        var firstUserFound = false
        val sanitizedTurns = mutableListOf<Pair<String, Boolean>>()
        for (turn in pastHistory) {
            val (text, isUser) = turn
            if (!firstUserFound && !isUser) {
                continue // Skip initial model greeting
            }
            firstUserFound = true
            sanitizedTurns.add(turn)
        }

        // 3. Ensure strict alternation of roles (user -> model -> user -> model)
        val alternatingTurns = mutableListOf<Pair<String, Boolean>>()
        for (turn in sanitizedTurns) {
            if (alternatingTurns.isEmpty()) {
                if (turn.second) { // Must start with user
                    alternatingTurns.add(turn)
                }
            } else {
                val lastIsUser = alternatingTurns.last().second
                if (lastIsUser != turn.second) {
                    alternatingTurns.add(turn)
                } else {
                    // Merge same-role turns into previous turn to avoid HTTP 400
                    val (prevText, prevIsUser) = alternatingTurns.removeAt(alternatingTurns.size - 1)
                    alternatingTurns.add(Pair("$prevText\n${turn.first}", prevIsUser))
                }
            }
        }

        // 4. If the last history turn was 'user', drop it because the upcoming current prompt will be 'user'
        if (alternatingTurns.isNotEmpty() && alternatingTurns.last().second) {
            alternatingTurns.removeAt(alternatingTurns.size - 1)
        }

        // 5. Add history to JSON array
        for ((text, isUser) in alternatingTurns) {
            val role = if (isUser) "user" else "model"
            val parts = JSONArray().apply {
                put(JSONObject().put("text", text))
            }
            contentsArray.put(
                JSONObject().apply {
                    put("role", role)
                    put("parts", parts)
                }
            )
        }

        // 6. Current user turn (always role: "user")
        val currentParts = JSONArray()

        if (imageBitmap != null) {
            val outputStream = ByteArrayOutputStream()
            imageBitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
            val base64Image = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)

            val imagePart = JSONObject().apply {
                put("inlineData", JSONObject().apply {
                    put("mimeType", "image/jpeg")
                    put("data", base64Image)
                })
            }
            currentParts.put(imagePart)
        }

        val promptText = if (prompt.isNotBlank()) prompt else if (imageBitmap != null) "حلل هذه الصورة باللغة العربية بالتفصيل" else "مرحباً"
        currentParts.put(JSONObject().put("text", promptText))

        contentsArray.put(
            JSONObject().apply {
                put("role", "user")
                put("parts", currentParts)
            }
        )

        return contentsArray
    }

    /**
     * Executes generateContent API call iteratively across candidate models:
     * - Automatic model fallback if model returns 404 (NOT_FOUND) or 429 (quota exhausted)
     * - Exponential backoff retry on transient HTTP 429
     * - Detailed and localized error reporting with exact API reasons
     * - Network timeout and connection protection
     */
    private suspend fun callGeminiApi(
        prompt: String,
        systemInstruction: String? = null,
        imageBitmap: Bitmap? = null,
        history: List<Pair<String, Boolean>> = emptyList()
    ): Result<String> = withContext(Dispatchers.IO) {
        val apiKey = getApiKey()
        if (apiKey.isBlank()) {
            return@withContext Result.failure(IllegalStateException(GeminiConfig.MSG_API_KEY_REQUIRED))
        }

        // Active rate limit cooldown check
        val now = System.currentTimeMillis()
        if (now < rateLimitCooldownUntil) {
            return@withContext Result.failure(IllegalStateException(GeminiConfig.MSG_RATE_LIMIT))
        }

        try {
            withTimeout(GeminiConfig.COROUTINE_TIMEOUT_MS) {
                requestMutex.withLock {
                    val candidateModels = getCandidateModels()
                    var lastErrorMessage = "تعذر الحصول على رد من نموذج الذكاء الاصطناعي."

                    for (modelName in candidateModels) {
                        val maxRetries = GeminiConfig.MAX_RETRIES_ON_429
                        var attempt = 0
                        var delayMs = GeminiConfig.INITIAL_BACKOFF_MS
                        var shouldTryNextModel = false

                        while (attempt <= maxRetries && !shouldTryNextModel) {
                            try {
                                val url = "https://generativelanguage.googleapis.com/v1beta/models/$modelName:generateContent?key=$apiKey"

                                val rootJson = JSONObject()

                                // 1. System instruction
                                if (!systemInstruction.isNullOrBlank()) {
                                    val systemParts = JSONArray().apply {
                                        put(JSONObject().put("text", systemInstruction))
                                    }
                                    rootJson.put("systemInstruction", JSONObject().put("parts", systemParts))
                                }

                                // 2. Build sanitized contents
                                val contentsArray = buildContentsJsonArray(prompt, imageBitmap, history)
                                rootJson.put("contents", contentsArray)

                                // 3. Generation configuration
                                val genConfig = JSONObject().apply {
                                    put("temperature", 0.7)
                                    put("topP", 0.95)
                                    put("maxOutputTokens", 4096)
                                }
                                rootJson.put("generationConfig", genConfig)

                                val requestBody = rootJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                                val request = Request.Builder()
                                    .url(url)
                                    .post(requestBody)
                                    .addHeader("Content-Type", "application/json")
                                    .build()

                                val response = httpClient.newCall(request).execute()
                                val responseBody = response.body?.string() ?: ""

                                if (response.isSuccessful) {
                                    verifiedActiveModel = modelName
                                    rateLimitCooldownUntil = 0L

                                    val jsonResponse = JSONObject(responseBody)
                                    val candidates = jsonResponse.optJSONArray("candidates")
                                    if (candidates != null && candidates.length() > 0) {
                                        val firstCandidate = candidates.getJSONObject(0)
                                        val contentObj = firstCandidate.optJSONObject("content")
                                        val parts = contentObj?.optJSONArray("parts")
                                        if (parts != null && parts.length() > 0) {
                                            val textBuilder = StringBuilder()
                                            for (i in 0 until parts.length()) {
                                                val part = parts.getJSONObject(i)
                                                val text = part.optString("text", "")
                                                textBuilder.append(text)
                                            }
                                            val resultText = textBuilder.toString().trim()
                                            if (resultText.isNotBlank()) {
                                                return@withLock Result.success(resultText)
                                            }
                                        }

                                        // Check finishReason if text is empty
                                        val finishReason = firstCandidate.optString("finishReason", "")
                                        if (finishReason.isNotBlank() && finishReason != "STOP") {
                                            val reasonText = when (finishReason) {
                                                "SAFETY" -> "تم حجب الرد بسبب معايير الأمان والسلامة (SAFETY)."
                                                "RECITATION" -> "تم حجب الرد بسبب حقوق الملكية (RECITATION)."
                                                "MAX_TOKENS" -> "تم الوصول إلى الحد الأقصى لطول الإجابة (MAX_TOKENS)."
                                                else -> "توقف توليد الرد (السبب: $finishReason)."
                                            }
                                            return@withLock Result.success(reasonText)
                                        }
                                    }

                                    val promptFeedback = jsonResponse.optJSONObject("promptFeedback")
                                    if (promptFeedback != null) {
                                        val blockReason = promptFeedback.optString("blockReason", "")
                                        if (blockReason.isNotBlank()) {
                                            return@withLock Result.failure(Exception("تم حجب الطلب بواسطة سياسة المحتوى ($blockReason)."))
                                        }
                                    }

                                    return@withLock Result.success("تم استلام استجابة بدون محتوى نصي.")
                                }

                                Log.w(TAG, "API call to model $modelName failed with HTTP ${response.code}")

                                var detailedApiMessage = ""
                                var isRateLimited = (response.code == 429)
                                var isModelUnavailable = (response.code == 404)

                                if (responseBody.isNotBlank()) {
                                    try {
                                        val errorJson = JSONObject(responseBody).optJSONObject("error")
                                        if (errorJson != null) {
                                            val apiMsg = errorJson.optString("message", "")
                                            val status = errorJson.optString("status", "")
                                            detailedApiMessage = apiMsg

                                            if (status == "NOT_FOUND" ||
                                                apiMsg.contains("not found", ignoreCase = true) ||
                                                apiMsg.contains("is not supported", ignoreCase = true) ||
                                                apiMsg.contains("is no longer available", ignoreCase = true) ||
                                                apiMsg.contains("not available", ignoreCase = true)
                                            ) {
                                                isModelUnavailable = true
                                            }

                                            if (status == "RESOURCE_EXHAUSTED" ||
                                                apiMsg.contains("quota", ignoreCase = true) ||
                                                apiMsg.contains("rate limit", ignoreCase = true) ||
                                                apiMsg.contains("Too Many Requests", ignoreCase = true)
                                            ) {
                                                isRateLimited = true
                                            }
                                        }
                                    } catch (_: Exception) {}
                                }

                                // 429 Rate Limit Handling: Retry with backoff or fallback to next model
                                if (isRateLimited) {
                                    if (attempt < maxRetries) {
                                        attempt++
                                        Log.d(TAG, "Retrying model $modelName after 429 backoff (attempt $attempt)...")
                                        delay(delayMs)
                                        delayMs = (delayMs * 2).coerceAtMost(GeminiConfig.MAX_BACKOFF_MS)
                                        continue
                                    } else {
                                        // This model's quota is exhausted; try next fallback model
                                        Log.w(TAG, "Quota exhausted on $modelName, trying next fallback candidate...")
                                        lastErrorMessage = if (detailedApiMessage.isNotBlank()) {
                                            "تم استنفاد الحصة للنموذج $modelName (429): $detailedApiMessage"
                                        } else {
                                            GeminiConfig.MSG_RATE_LIMIT
                                        }
                                        shouldTryNextModel = true
                                        break
                                    }
                                }

                                // 404 / Model Unavailable Handling -> Try next candidate model
                                if (isModelUnavailable) {
                                    Log.w(TAG, "Model $modelName is unavailable (404), switching to next model...")
                                    if (verifiedActiveModel == modelName) {
                                        verifiedActiveModel = null
                                    }
                                    lastErrorMessage = "النموذج $modelName غير متاح حالياً (404)."
                                    shouldTryNextModel = true
                                    break
                                }

                                // 400 Bad Request
                                if (response.code == 400) {
                                    Log.e(TAG, "HTTP 400 on model $modelName: $detailedApiMessage")
                                    lastErrorMessage = if (detailedApiMessage.isNotBlank()) {
                                        "خطأ في الطلب (HTTP 400): $detailedApiMessage"
                                    } else {
                                        GeminiConfig.MSG_INVALID_REQUEST
                                    }
                                    shouldTryNextModel = true
                                    break
                                }

                                // 403 Forbidden (API Key issue)
                                if (response.code == 403) {
                                    Log.e(TAG, "HTTP 403 on model $modelName: $detailedApiMessage")
                                    val msg = if (detailedApiMessage.isNotBlank()) {
                                        "خطأ في صلاحية مفتاح Gemini API (HTTP 403): $detailedApiMessage"
                                    } else {
                                        GeminiConfig.MSG_AUTH_ERROR
                                    }
                                    return@withLock Result.failure(Exception(msg))
                                }

                                // 500, 503 Server Busy
                                if (response.code in 500..599) {
                                    Log.w(TAG, "Server error HTTP ${response.code} on model $modelName: $detailedApiMessage")
                                    lastErrorMessage = "خوادم الذكاء الاصطناعي مشغولة حالياً (رمز: ${response.code})."
                                    shouldTryNextModel = true
                                    break
                                }

                                val genericError = if (detailedApiMessage.isNotBlank()) {
                                    "خطأ من الخادم (رمز ${response.code}): $detailedApiMessage"
                                } else {
                                    "فشل الاتصال بنموذج الذكاء الاصطناعي (رمز: ${response.code})."
                                }
                                lastErrorMessage = genericError
                                shouldTryNextModel = true
                                break

                            } catch (e: SocketTimeoutException) {
                                Log.w(TAG, "SocketTimeoutException on model $modelName: ${e.message}")
                                if (attempt < maxRetries) {
                                    attempt++
                                    delay(delayMs)
                                } else {
                                    lastErrorMessage = GeminiConfig.MSG_TIMEOUT
                                    shouldTryNextModel = true
                                    break
                                }
                            } catch (e: UnknownHostException) {
                                Log.w(TAG, "UnknownHostException: ${e.message}")
                                return@withLock Result.failure(Exception(GeminiConfig.MSG_NO_NETWORK))
                            } catch (e: IOException) {
                                Log.w(TAG, "IOException on model $modelName: ${e.message}")
                                if (attempt < maxRetries) {
                                    attempt++
                                    delay(delayMs)
                                } else {
                                    lastErrorMessage = GeminiConfig.MSG_NO_NETWORK
                                    shouldTryNextModel = true
                                    break
                                }
                            }
                        }
                    }

                    rateLimitCooldownUntil = System.currentTimeMillis() + GeminiConfig.RATE_LIMIT_COOLDOWN_MS
                    Result.failure(Exception(lastErrorMessage))
                }
            }
        } catch (e: TimeoutCancellationException) {
            Log.w(TAG, "Request cancelled due to timeout")
            Result.failure(Exception(GeminiConfig.MSG_TIMEOUT))
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error in callGeminiApi: ${e.message}")
            val msg = e.localizedMessage ?: e.message ?: GeminiConfig.MSG_TIMEOUT
            Result.failure(Exception(msg))
        }
    }

    suspend fun generateChatReply(
        prompt: String,
        mode: ReasoningMode,
        imageBitmap: Bitmap? = null,
        history: List<Pair<String, Boolean>> = emptyList()
    ): String {
        val result = callGeminiApi(
            prompt = prompt,
            systemInstruction = mode.systemInstruction,
            imageBitmap = imageBitmap,
            history = history
        )

        return result.getOrElse { error ->
            error.message ?: GeminiConfig.MSG_RATE_LIMIT
        }
    }

    suspend fun enhanceImagePrompt(userPrompt: String, style: String): String {
        val systemPrompt = "You are an expert AI prompt engineer. Convert the user's prompt into an ultra-detailed, vivid English prompt suitable for Imagen 3 and high-end image models. Include lighting, composition, mood, textures, and specify style: $style. Output ONLY the refined English prompt text, nothing else."
        val result = callGeminiApi(prompt = userPrompt, systemInstruction = systemPrompt)
        return result.getOrElse { userPrompt }
    }

    suspend fun generateStoryboard(topic: String, duration: String, tone: String): StoryboardItem {
        val systemPrompt = """
            أنت مخرج سينمائي وكاتب سيناريو محترف للذكاء الاصطناعي.
            المطلوب: توليد قصة مصورة (Storyboard) متكاملة واحترافية للموضوع المعطى.
            قم بالرد فقط بملف JSON صالح بالهيكل التالي بدون أي نصوص خارج الـ JSON:
            {
              "title": "عنوان السيناريو",
              "logline": "وصف موجز ومثير في سطر واحد",
              "scenes": [
                {
                  "sceneNumber": 1,
                  "timestamp": "0:00 - 0:05",
                  "visualDescription": "وصف المشهد البصري باللغة العربية",
                  "veoPromptEnglish": "Detailed cinematic prompt in English for Veo 3.1 video generation",
                  "voiceoverArabic": "التعليق الصوتي الفصيح للمشهد",
                  "soundEffects": "المؤثرات الصوتية والخلفية الموسيقية",
                  "cameraAngle": "زاوية الكاميرا والحركة (مثل: لقطة علوية بطيئة)",
                  "keyframeColor": "#1E3A8A"
                }
              ]
            }
        """.trimIndent()

        val prompt = "موضوع الفيديو: $topic\nالمدة المطلوبة: $duration\nالنبرة والأسلوب: $tone"
        val result = callGeminiApi(prompt = prompt, systemInstruction = systemPrompt)

        return result.mapCatching { responseText ->
            val cleanJson = responseText
                .replace("```json", "")
                .replace("```", "")
                .trim()

            val jsonObject = JSONObject(cleanJson)
            val title = jsonObject.optString("title", "سيناريو احترافي: $topic")
            val logline = jsonObject.optString("logline", "رؤية بصرية سينمائية متكاملة")
            val scenesArray = jsonObject.optJSONArray("scenes")
            val scenes = mutableListOf<SceneItem>()

            if (scenesArray != null) {
                for (i in 0 until scenesArray.length()) {
                    val sc = scenesArray.getJSONObject(i)
                    scenes.add(
                        SceneItem(
                            sceneNumber = sc.optInt("sceneNumber", i + 1),
                            timestamp = sc.optString("timestamp", "0:0${i * 5}"),
                            visualDescription = sc.optString("visualDescription", "لقطة بصرية معبرة"),
                            veoPromptEnglish = sc.optString("veoPromptEnglish", "Cinematic 4K scene"),
                            voiceoverArabic = sc.optString("voiceoverArabic", "صوت معبر..."),
                            soundEffects = sc.optString("soundEffects", "موسيقى سينمائية"),
                            cameraAngle = sc.optString("cameraAngle", "لقطة متوسطة"),
                            keyframeColor = sc.optString("keyframeColor", "#2563EB")
                        )
                    )
                }
            }

            StoryboardItem(
                id = UUID.randomUUID().toString(),
                title = title,
                logline = logline,
                totalDuration = duration,
                scenes = if (scenes.isNotEmpty()) scenes else createFallbackScenes(topic),
                createdAt = "الآن"
            )
        }.getOrElse {
            createFallbackStoryboard(topic, duration)
        }
    }

    private fun createFallbackScenes(topic: String): List<SceneItem> {
        return listOf(
            SceneItem(
                sceneNumber = 1,
                timestamp = "0:00 - 0:05",
                visualDescription = "مشهد افتتاحي بانورامي يبرز ملامح $topic بإضاءة دافئة سينمائية.",
                veoPromptEnglish = "Cinematic opening wide drone shot of $topic, golden hour warm sunlight, 4k hyper-realistic",
                voiceoverArabic = "في عالم يتجدد كل لحظة، تبدأ رحلتنا مع $topic...",
                soundEffects = "لحن وتري هادئ ومؤثر",
                cameraAngle = "لقطة واسعة متدرجة الهبوط",
                keyframeColor = "#1D4ED8"
            ),
            SceneItem(
                sceneNumber = 2,
                timestamp = "0:05 - 0:10",
                visualDescription = "تركيز بصري مكثف يظهر تفاصيل ديناميكية وحركة سريعة ومتقنة.",
                veoPromptEnglish = "Close-up cinematic shot with smooth camera movement and shallow depth of field, sharp focus, 8k",
                voiceoverArabic = "حيث تلتقي الرؤية بالإبداع لتصنع فارقاً حقيقياً.",
                soundEffects = "إيقاع تصاعدي ملهم",
                cameraAngle = "لقطة مقربة متحركة",
                keyframeColor = "#3B82F6"
            )
        )
    }

    private fun createFallbackStoryboard(topic: String, duration: String): StoryboardItem {
        return StoryboardItem(
            id = UUID.randomUUID().toString(),
            title = "سيناريو: $topic",
            logline = "رؤية إبداعية بصرية متناسقة مع موضوع $topic",
            totalDuration = duration,
            scenes = createFallbackScenes(topic),
            createdAt = "الآن"
        )
    }

    suspend fun refineArabicText(text: String, tone: String): String {
        val systemPrompt = "أنت خبير لغوي ومدقق نحوي وبلاغي باللغة العربية الفصحى. قم بتدقيق النص وتصحيح الأخطاء الإملائية والنحوية، وإعادة صياغته بأسلوب ($tone) مع تقديم النص النهائي المحسن متبوعاً بملاحظات موجزة إن لزم."
        val result = callGeminiApi(prompt = text, systemInstruction = systemPrompt)
        return result.getOrElse { it.message ?: "تعذر تدقيق النص." }
    }

    suspend fun translateText(text: String, targetLanguage: String): String {
        val systemPrompt = "أنت مترجم فوري وأدبي بارع. قم بترجمة النص إلى ($targetLanguage) مع الحفاظ على روح وسياق المعنى الأصلي بدقة فائقة وبلاغة أصلية."
        val result = callGeminiApi(prompt = text, systemInstruction = systemPrompt)
        return result.getOrElse { it.message ?: "تعذر إجراء الترجمة." }
    }
}
