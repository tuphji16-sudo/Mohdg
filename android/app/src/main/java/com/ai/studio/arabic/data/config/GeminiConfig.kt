package com.ai.studio.arabic.data.config

/**
 * Centralized configuration for Google Gemini API models, timeouts, and error messages.
 */
object GeminiConfig {

    // Primary current supported models (Latest verified Gemini endpoints)
    const val PRIMARY_MODEL = "gemini-3.6-flash"

    // Fallback models ordered by priority (all active and verified in Google AI Studio)
    val FALLBACK_MODELS = listOf(
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.7-flash",
        "gemini-3.1-pro-preview"
    )

    // Network Timeouts
    const val CONNECT_TIMEOUT_SECONDS = 15L
    const val READ_TIMEOUT_SECONDS = 30L
    const val WRITE_TIMEOUT_SECONDS = 15L
    const val COROUTINE_TIMEOUT_MS = 40000L

    // Rate Limiting (HTTP 429) & Retry Configuration
    const val MAX_RETRIES_ON_429 = 2
    const val INITIAL_BACKOFF_MS = 1200L
    const val MAX_BACKOFF_MS = 3000L
    const val RATE_LIMIT_COOLDOWN_MS = 2500L

    // Standard User-Facing Arabic Messages
    const val MSG_RATE_LIMIT = "تم الوصول إلى الحد المؤقت للطلبات (429 Rate Limit). يرجى الانتظار بضع ثوانٍ ثم إعادة المحاولة."
    const val MSG_API_KEY_REQUIRED = "⚠️ يرجى إدخال مفتاح Gemini API من خلال أيقونة المفتاح 🔑 في أعلى الشاشة."
    const val MSG_AUTH_ERROR = "⚠️ خطأ في صلاحية المفتاح (403): يرجى التحقق من صحة وتفعيل مفتاح Gemini API من زر 🔑 في الأعلى."
    const val MSG_INVALID_REQUEST = "خطأ في بنية الطلب (400): يرجى المحاولة بصياغة مختلفة."
    const val MSG_MODEL_UNAVAILABLE = "النموذج غير متاح حالياً، جاري التبديل التلقائي لنموذج متاح..."
    const val MSG_NO_NETWORK = "تعذر الاتصال بالشبكة، يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً."
    const val MSG_TIMEOUT = "استغرق خادم الذكاء الاصطناعي وقتاً أطول من المتوقع، يرجى إعادة المحاولة."
    const val MSG_SERVER_BUSY = "خوادم الذكاء الاصطناعي مشغولة حالياً، يرجى المحاولة بعد لحظات."
}
