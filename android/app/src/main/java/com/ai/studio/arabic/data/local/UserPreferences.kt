package com.ai.studio.arabic.data.local

import android.content.Context
import android.content.SharedPreferences

object UserPreferences {
    private const val PREFS_NAME = "ai_studio_prefs"
    private const val KEY_CUSTOM_API_KEY = "custom_gemini_api_key"

    @Volatile
    private var inMemoryApiKey: String? = null

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getApiKey(context: Context? = null): String {
        val memoryKey = inMemoryApiKey
        if (!memoryKey.isNullOrBlank()) {
            return memoryKey.trim()
        }
        if (context != null) {
            val stored = getPrefs(context).getString(KEY_CUSTOM_API_KEY, "") ?: ""
            if (stored.isNotBlank()) {
                inMemoryApiKey = stored.trim()
                return stored.trim()
            }
        }
        return ""
    }

    fun setApiKey(context: Context?, key: String) {
        val trimmed = key.trim()
        inMemoryApiKey = trimmed
        context?.let {
            getPrefs(it).edit().putString(KEY_CUSTOM_API_KEY, trimmed).apply()
        }
    }
}
