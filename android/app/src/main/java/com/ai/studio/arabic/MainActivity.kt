package com.ai.studio.arabic

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import com.ai.studio.arabic.data.local.UserPreferences
import com.ai.studio.arabic.ui.screens.MainScreen
import com.ai.studio.arabic.ui.theme.AIStudioArabicTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        UserPreferences.init(this)
        enableEdgeToEdge()
        setContent {
            AIStudioArabicTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    MainScreen()
                }
            }
        }
    }
}
