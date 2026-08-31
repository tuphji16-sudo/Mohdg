package com.ai.studio.arabic.viewmodel

import android.content.Context
import android.graphics.Bitmap
import android.speech.tts.TextToSpeech
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ai.studio.arabic.data.models.ChatMessage
import com.ai.studio.arabic.data.models.ReasoningMode
import com.ai.studio.arabic.data.repository.GeminiRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class ChatViewModel(private val repository: GeminiRepository = GeminiRepository()) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessage>>(
        listOf(
            ChatMessage(
                id = UUID.randomUUID().toString(),
                isUser = false,
                content = "مرحباً بك! أنا رفيقك الذكي باللغة العربية، كيف يمكنني مساعدتك اليوم في أفكارك، كتاباتك، أو تحليلاتك؟",
                timestamp = getCurrentTime()
            )
        )
    )
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _selectedMode = MutableStateFlow(ReasoningMode.BALANCED)
    val selectedMode: StateFlow<ReasoningMode> = _selectedMode.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _attachedImageBitmap = MutableStateFlow<Bitmap?>(null)
    val attachedImageBitmap: StateFlow<Bitmap?> = _attachedImageBitmap.asStateFlow()

    private var tts: TextToSpeech? = null
    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking.asStateFlow()

    fun initTts(context: Context) {
        if (tts == null) {
            tts = TextToSpeech(context.applicationContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.language = Locale("ar")
                }
            }
        }
    }

    fun setReasoningMode(mode: ReasoningMode) {
        _selectedMode.value = mode
    }

    fun setAttachedImage(bitmap: Bitmap?) {
        _attachedImageBitmap.value = bitmap
    }

    fun sendMessage(userText: String) {
        if (userText.isBlank() && _attachedImageBitmap.value == null) return

        val userMessage = ChatMessage(
            id = UUID.randomUUID().toString(),
            isUser = true,
            content = userText,
            timestamp = getCurrentTime()
        )

        _messages.value = _messages.value + userMessage
        val currentImage = _attachedImageBitmap.value
        _attachedImageBitmap.value = null
        _isLoading.value = true

        viewModelScope.launch {
            try {
                val replyText = repository.generateChatReply(
                    prompt = userText,
                    mode = _selectedMode.value,
                    imageBitmap = currentImage
                )

                val botMessage = ChatMessage(
                    id = UUID.randomUUID().toString(),
                    isUser = false,
                    content = replyText,
                    timestamp = getCurrentTime()
                )
                _messages.value = _messages.value + botMessage
            } catch (e: Exception) {
                val errorMessage = ChatMessage(
                    id = UUID.randomUUID().toString(),
                    isUser = false,
                    content = "عذراً، حدث خطأ: ${e.localizedMessage}",
                    timestamp = getCurrentTime()
                )
                _messages.value = _messages.value + errorMessage
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun speakText(text: String) {
        tts?.let {
            if (_isSpeaking.value) {
                it.stop()
                _isSpeaking.value = false
            } else {
                it.speak(text, TextToSpeech.QUEUE_FLUSH, null, "UtteranceId_${System.currentTimeMillis()}")
                _isSpeaking.value = true
            }
        }
    }

    fun clearChat() {
        _messages.value = listOf(
            ChatMessage(
                id = UUID.randomUUID().toString(),
                isUser = false,
                content = "تم بدء جلسة محادثة جديدة. كيف يمكنني مساعدتك؟",
                timestamp = getCurrentTime()
            )
        )
    }

    private fun getCurrentTime(): String {
        return SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
    }

    override fun onCleared() {
        super.onCleared()
        tts?.stop()
        tts?.shutdown()
    }
}
