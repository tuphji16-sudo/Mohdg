package com.ai.studio.arabic.data.repository

import android.content.Context
import android.graphics.Bitmap
import com.ai.studio.arabic.BuildConfig
import com.ai.studio.arabic.data.local.UserPreferences
import com.ai.studio.arabic.data.models.ReasoningMode
import com.ai.studio.arabic.data.models.SceneItem
import com.ai.studio.arabic.data.models.StoryboardItem
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.UUID

class GeminiRepository(private val context: Context? = null) {

    fun getApiKey(): String {
        val customKey = context?.let { UserPreferences.getApiKey(it) }
        if (!customKey.isNullOrBlank()) {
            return customKey
        }
        return BuildConfig.GEMINI_API_KEY
    }

    private fun getModel(systemInstruction: String? = null): GenerativeModel {
        val apiKey = getApiKey()
        if (apiKey.isBlank()) {
            throw IllegalStateException("مفتاح API غير متوفر. يرجى إدخال مفتاح Gemini API من زر المفتاح 🔑 في أعلى الشاشة.")
        }
        return GenerativeModel(
            modelName = "gemini-2.5-flash",
            apiKey = apiKey,
            systemInstruction = systemInstruction?.let { content { text(it) } }
        )
    }

    suspend fun generateChatReply(
        prompt: String,
        mode: ReasoningMode,
        imageBitmap: Bitmap? = null,
        history: List<Pair<String, Boolean>> = emptyList()
    ): String = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext "⚠️ يرجى ضبط مفتاح Gemini API من خلال أيقونة المفتاح 🔑 في أعلى الشاشة لتتمكن من إجراء المحادثات والاتصال بالذكاء الاصطناعي."
            }

            val model = getModel(mode.systemInstruction)
            if (imageBitmap != null) {
                val inputContent = content {
                    image(imageBitmap)
                    text(prompt)
                }
                val response = model.generateContent(inputContent)
                response.text ?: "عذراً، لم أتمكن من الحصول على إجابة."
            } else {
                val response = model.generateContent(prompt)
                response.text ?: "عذراً، لم أتمكن من الحصول على إجابة."
            }
        } catch (e: Exception) {
            val msg = e.localizedMessage ?: e.message ?: "خطأ غير معروف"
            if (msg.contains("PERMISSION_DENIED") || msg.contains("403") || msg.contains("API key")) {
                "⚠️ خطأ في صلاحية المفتاح (403 Permission Denied): تأكد من إدخال مفتاح Gemini API صالح من زر 🔑 في الأعلى."
            } else {
                "حدث خطأ أثناء التواصل مع نموذج الذكاء الاصطناعي: $msg"
            }
        }
    }

    suspend fun enhanceImagePrompt(userPrompt: String, style: String): String = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext userPrompt
            }
            val model = getModel(
                "You are an expert AI prompt engineer. Convert the user's prompt into an ultra-detailed, vivid English prompt suitable for Imagen 3 and high-end image models. Include lighting, composition, mood, textures, and specify style: $style. Output ONLY the refined English prompt text, nothing else."
            )
            val response = model.generateContent(userPrompt)
            response.text?.trim() ?: userPrompt
        } catch (e: Exception) {
            userPrompt
        }
    }

    suspend fun generateStoryboard(topic: String, duration: String, tone: String): StoryboardItem = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext createFallbackStoryboard(topic, duration)
            }

            val systemPrompt = """
                أنت مخرج سينمائي وكاتب سيناريو محترف للذكاء الاصطناعي.
                المطلوب: توليد قصة مصورة (Storyboard) متكاملة واحترافية للموضوع المعطى.
                قم بالرد فقط بملف JSON صالح بالهيكل التالي:
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

            val model = getModel(systemPrompt)
            val response = model.generateContent("موضوع الفيديو: $topic\nالمدة المطلوبة: $duration\nالنبرة والأسلوب: $tone")
            val rawJson = response.text?.replace("```json", "")?.replace("```", "")?.trim() ?: ""

            val jsonObject = JSONObject(rawJson)
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
                scenes = scenes,
                createdAt = "الآن"
            )
        } catch (e: Exception) {
            createFallbackStoryboard(topic, duration)
        }
    }

    private fun createFallbackStoryboard(topic: String, duration: String): StoryboardItem {
        return StoryboardItem(
            id = UUID.randomUUID().toString(),
            title = "سيناريو: $topic",
            logline = "رؤية إبداعية بصرية متناسقة مع موضوع $topic",
            totalDuration = duration,
            scenes = listOf(
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
            ),
            createdAt = "الآن"
        )
    }

    suspend fun refineArabicText(text: String, tone: String): String = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext "⚠️ يرجى ضبط مفتاح Gemini API من أيقونة المفتاح 🔑 أولاً."
            }
            val model = getModel(
                "أنت خبير لغوي ومدقق نحوي وبلاغي باللغة العربية الفصحى. قم بتدقيق النص وتصحيح الأخطاء الإملائية والنحوية، وإعادة صياغته بأسلوب ($tone) مع تقديم النص النهائي المحسن متبوعاً بملاحظات موجزة إن لزم."
            )
            val response = model.generateContent(text)
            response.text ?: "تعذر تدقيق النص."
        } catch (e: Exception) {
            val msg = e.localizedMessage ?: e.message ?: "خطأ"
            "خطأ: $msg"
        }
    }

    suspend fun translateText(text: String, targetLanguage: String): String = withContext(Dispatchers.IO) {
        try {
            val apiKey = getApiKey()
            if (apiKey.isBlank()) {
                return@withContext "⚠️ يرجى ضبط مفتاح Gemini API من أيقونة المفتاح 🔑 أولاً."
            }
            val model = getModel(
                "أنت مترجم فوري وأدبي بارع. قم بترجمة النص إلى ($targetLanguage) مع الحفاظ على روح وسياق المعنى الأصلي بدقة فائقة وبلاغة أصلية."
            )
            val response = model.generateContent(text)
            response.text ?: "تعذر إجراء الترجمة."
        } catch (e: Exception) {
            val msg = e.localizedMessage ?: e.message ?: "خطأ"
            "خطأ: $msg"
        }
    }
}
