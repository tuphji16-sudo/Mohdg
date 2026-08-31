package com.ai.studio.arabic.data.models

enum class ReasoningMode(val title: String, val subtitle: String, val systemInstruction: String) {
    BALANCED(
        "متوازن (Flash)",
        "إجابات سريعة وذكية لمختلف المهام",
        "أنت مساعد ذكاء اصطناعي فصيح وخبير باللغة العربية. أجب بدقة ووضوح وبلاغة."
    ),
    DEEP_THINKING(
        "تفكير عميق (Reasoning)",
        "تحليل منطقي وحل معقد للمسائل والقرارات",
        "أنت مفكر تحليلي عميق. قم بتحليل السؤال خطوة بخطوة واستعرض الحجج والحلول بعمق منطقي باللغة العربية الفصحى."
    ),
    CREATIVE(
        "إبداعي وأدبي",
        "كتابة نصوص وقصائد وصياغة بلاغية فاخرة",
        "أنت كاتب وأديب عربي بارع، استخدم جزالة الألفاظ والبيان البلاغي وتشبيهات بديعة باللغة العربية الفصحى."
    ),
    CODE(
        "برمجة وهندسة",
        "كتابة وتدقيق الأكواد وبناء الخوارزميات",
        "أنت مهندس برمجيات ومبرمج خبير. اكتب أكواداً نظيفة وشروحات فنية دقيقة باللغة العربية والإنجليزية."
    )
}

data class ChatMessage(
    val id: String,
    val isUser: Boolean,
    val content: String,
    val timestamp: String,
    val attachedImageUri: String? = null,
    val isThinking: Boolean = false,
    val reasoningLog: String? = null
)

data class GeneratedImageItem(
    val id: String,
    val url: String,
    val prompt: String,
    val style: String,
    val aspectRatio: String,
    val createdAt: String
)

data class SceneItem(
    val sceneNumber: Int,
    val timestamp: String,
    val visualDescription: String,
    val veoPromptEnglish: String,
    val voiceoverArabic: String,
    val soundEffects: String,
    val cameraAngle: String,
    val keyframeColor: String
)

data class StoryboardItem(
    val id: String,
    val title: String,
    val logline: String,
    val totalDuration: String,
    val scenes: List<SceneItem>,
    val createdAt: String
)

data class SavedAudioItem(
    val id: String,
    val text: String,
    val voice: String,
    val createdAt: String
)

data class QuickTemplate(
    val id: String,
    val title: String,
    val description: String,
    val category: String,
    val prompt: String,
    val targetTab: String
)
