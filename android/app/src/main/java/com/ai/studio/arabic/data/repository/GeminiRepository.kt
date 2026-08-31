package com.ai.studio.arabic.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.util.Base64
import com.ai.studio.arabic.BuildConfig
import com.ai.studio.arabic.data.local.UserPreferences
import com.ai.studio.arabic.data.models.ReasoningMode
import com.ai.studio.arabic.data.models.SceneItem
import com.ai.studio.arabic.data.models.StoryboardItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.UUID
import java.util.concurrent.TimeUnit

class GeminiRepository(private val context: Context? = null) {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    // Ordered sequence of verified models to try automatically
    private val candidateModels = listOf(
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-latest",
        "gemini-pro"
    )

    fun getApiKey(): String {
        val customKey = context?.let { UserPreferences.getApiKey(it) }
        if (!customKey.isNullOrBlank()) {
            return customKey.trim()
        }
        return BuildConfig.GEMINI_API_KEY.trim()
    }

    /**
     * Executes a raw generateContent call to Gemini REST API with robust JSON parsing and multi-model fallback.
     */
    private suspend fun callGeminiApi(
        prompt: String,
        systemInstruction: String? = null,
        imageBitmap: Bitmap? = null,
        history: List<Pair<String, Boolean>> = emptyList(),
        modelIndex: Int = 0
    ): Result<String> = withContext(Dispatchers.IO) {
        val apiKey = getApiKey()
        if (apiKey.isBlank()) {
            return@withContext Result.failure(
                IllegalStateException("⚠️ يرجى ضبط مفتاح Gemini API من خلال أيقونة المفتاح 🔑 في أعلى الشاشة.")
            )
        }

        val modelName = candidateModels.getOrElse(modelIndex) { candidateModels.first() }

        try {
            val url = "https://generativelanguage.googleapis.com/v1beta/models/$modelName:generateContent?key=$apiKey"

            val rootJson = JSONObject()

            // 1. System instruction if present
            if (!systemInstruction.isNullOrBlank()) {
                val systemParts = JSONArray().apply {
                    put(JSONObject().put("text", systemInstruction))
                }
                rootJson.put("systemInstruction", JSONObject().put("parts", systemParts))
            }

            // 2. Contents array
            val contentsArray = JSONArray()

            // Add previous history turns if any
            for ((text, isUser) in history) {
                val role = if (isUser) "user" else "model"
                val turnParts = JSONArray().apply {
                    put(JSONObject().put("text", text))
                }
                contentsArray.put(
                    JSONObject().apply {
                        put("role", role)
                        put("parts", turnParts)
                    }
                )
            }

            // Current turn parts
            val currentParts = JSONArray()

            // Multimodal image attachment
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

            // Prompt text part
            currentParts.put(JSONObject().put("text", prompt))

            contentsArray.put(
                JSONObject().apply {
                    put("role", "user")
                    put("parts", currentParts)
                }
            )

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

            if (!response.isSuccessful) {
                var errorMessage = "HTTP ${response.code}: ${response.message}"
                var is404ModelNotFound = false

                try {
                    if (responseBody.isNotBlank()) {
                        val errorJson = JSONObject(responseBody).optJSONObject("error")
                        if (errorJson != null) {
                            val msg = errorJson.optString("message", "")
                            val status = errorJson.optString("status", "")
                            errorMessage = if (msg.isNotBlank()) msg else status

                            if (response.code == 404 || status == "NOT_FOUND" ||
                                msg.contains("not found", ignoreCase = true) ||
                                msg.contains("is no longer available", ignoreCase = true) ||
                                msg.contains("not supported for generateContent", ignoreCase = true)
                            ) {
                                is404ModelNotFound = true
                            }
                        }
                    }
                } catch (_: Exception) {}

                // If model is not found or unsupported, fallback to next available model in the sequence
                if (is404ModelNotFound && modelIndex + 1 < candidateModels.size) {
                    return@withContext callGeminiApi(
                        prompt = prompt,
                        systemInstruction = systemInstruction,
                        imageBitmap = imageBitmap,
                        history = history,
                        modelIndex = modelIndex + 1
                    )
                }

                val friendlyError = when (response.code) {
                    400 -> "خطأ في بنية الطلب (400): $errorMessage"
                    403 -> "⚠️ خطأ في صلاحية المفتاح (403 Permission Denied): تأكد من صحة وتفعيل مفتاح Gemini API من زر 🔑 في الأعلى."
                    404 -> "النموذج غير متاح حالياً ($modelName): $errorMessage"
                    429 -> "تم تجاوز حد الطلبات المسموح به مؤقتاً (429 Too Many Requests). يرجى الانتظار قليلاً والمحاولة مجدداً."
                    500, 503 -> "خوادم الذكاء الاصطناعي مشغولة حالياً، يرجى المحاولة بعد لحظات."
                    else -> "فشل الاتصال بنموذج الذكاء الاصطناعي: $errorMessage"
                }

                return@withContext Result.failure(Exception(friendlyError))
            }

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
                        return@withContext Result.success(resultText)
                    }
                }
            }

            Result.success("تم استلام رد بدون محتوى نصي.")
        } catch (e: Exception) {
            val msg = e.localizedMessage ?: e.message ?: "خطأ في الشبكة"
            Result.failure(Exception("تعذر إكمال الطلب: $msg"))
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
            error.message ?: "حدث خطأ غير متوقع أثناء المعالجة."
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
