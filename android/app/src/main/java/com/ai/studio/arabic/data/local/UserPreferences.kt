package com.ai.studio.arabic.data.local

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences

object UserPreferences {
    private const val PREFS_NAME = "ai_studio_prefs"
    private const val KEY_CUSTOM_API_KEY = "custom_gemini_api_key"

    @Volatile
    private var inMemoryApiKey: String? = null

    @SuppressLint("StaticFieldLeak")
    @Volatile
    private var appContext: Context? = null

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun init(context: Context) {
        appContext = context.applicationContext
        val stored = getPrefs(context.applicationContext).getString(KEY_CUSTOM_API_KEY, "") ?: ""
        if (stored.isNotBlank()) {
            inMemoryApiKey = stored.trim()
        }
    }

    fun getApiKey(context: Context? = null): String {
        val memoryKey = inMemoryApiKey
        if (!memoryKey.isNullOrBlank()) {
            return memoryKey.trim()
        }
        val targetContext = context?.applicationContext ?: appContext
        if (targetContext != null) {
            val stored = getPrefs(targetContext).getString(KEY_CUSTOM_API_KEY, "") ?: ""
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
        val targetContext = context?.applicationContext ?: appContext
        targetContext?.let {
            appContext = it
            getPrefs(it).edit().putString(KEY_CUSTOM_API_KEY, trimmed).apply()
        }
    }
}
