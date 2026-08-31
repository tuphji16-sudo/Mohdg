package com.ai.studio.arabic.data.config

/**
 * Centralized configuration for Google Gemini API models, timeouts, and error messages.
 * You can easily modify default models, timeouts, or retry parameters in this single location.
 */
object GeminiConfig {

    // Primary current supported model (Gemini 2.0 Flash)
    const val PRIMARY_MODEL = "gemini-2.0-flash"

    // Fallback models ordered by priority (strictly supported models, no deprecated 1.5 versions)
    val FALLBACK_MODELS = listOf(
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-pro"
    )

    // Network Timeouts
    const val CONNECT_TIMEOUT_SECONDS = 25L
    const val READ_TIMEOUT_SECONDS = 50L
    const val WRITE_TIMEOUT_SECONDS = 30L

    // Rate Limiting (HTTP 429) & Retry Configuration
    const val MAX_RETRIES_ON_429 = 2
    const val INITIAL_BACKOFF_MS = 2000L
    const val MAX_BACKOFF_MS = 6000L
    const val RATE_LIMIT_COOLDOWN_MS = 5000L

    // Standard User-Facing Arabic Messages
    const val MSG_RATE_LIMIT = "تم الوصول إلى الحد المؤقت للطلبات. انتظر قليلاً ثم حاول مرة أخرى."
    const val MSG_API_KEY_REQUIRED = "⚠️ يرجى إدخال مفتاح Gemini API من خلال أيقونة المفتاح 🔑 في أعلى الشاشة."
    const val MSG_AUTH_ERROR = "⚠️ خطأ في صلاحية المفتاح (403): يرجى التحقق من صحة وتفعيل مفتاح Gemini API من زر 🔑 في الأعلى."
    const val MSG_NO_NETWORK = "تعذر الاتصال بالشبكة، يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً."
    const val MSG_TIMEOUT = "استغرق خادم الذكاء الاصطناعي وقتاً أطول من المتوقع، يرجى إعادة المحاولة."
    const val MSG_SERVER_BUSY = "خوادم الذكاء الاصطناعي مشغولة حالياً، يرجى المحاولة بعد لحظات."
}
