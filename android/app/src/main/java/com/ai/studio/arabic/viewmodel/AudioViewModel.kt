package com.ai.studio.arabic.viewmodel

import android.content.Context
import android.speech.tts.TextToSpeech
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ai.studio.arabic.data.models.SavedAudioItem
import com.ai.studio.arabic.data.repository.GeminiRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Locale
import java.util.UUID

class AudioViewModel(private val repository: GeminiRepository = GeminiRepository()) : ViewModel() {

    private val _activeSubTab = MutableStateFlow("tts")
    val activeSubTab: StateFlow<String> = _activeSubTab.asStateFlow()

    // TTS
    private val _ttsText = MutableStateFlow("مرحباً بكم في استوديو الصوت واللغة العربية الفصيحة المدعوم بالذكاء الاصطناعي.")
    val ttsText: StateFlow<String> = _ttsText.asStateFlow()

    private val _selectedVoice = MutableStateFlow("fusha_male")
    val selectedVoice: StateFlow<String> = _selectedVoice.asStateFlow()

    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking.asStateFlow()

    private val _savedAudios = MutableStateFlow<List<SavedAudioItem>>(
        listOf(
            SavedAudioItem(
                id = "aud_1",
                text = "اللغة العربية هي لغة الفصاحة والبيان، تزخر بالجمال والدقة التعبيرية.",
                voice = "فصيح - نبرة رخيمة",
                createdAt = "اليوم"
            )
        )
    )
    val savedAudios: StateFlow<List<SavedAudioItem>> = _savedAudios.asStateFlow()

    // Proofread / Refine
    private val _draftText = MutableStateFlow("")
    val draftText: StateFlow<String> = _draftText.asStateFlow()

    private val _refineTone = MutableStateFlow("فصيح وبليغ")
    val refineTone: StateFlow<String> = _refineTone.asStateFlow()

    private val _refinedResult = MutableStateFlow<String?>(null)
    val refinedResult: StateFlow<String?> = _refinedResult.asStateFlow()

    private val _isRefining = MutableStateFlow(false)
    val isRefining: StateFlow<Boolean> = _isRefining.asStateFlow()

    // Translate
    private val _sourceText = MutableStateFlow("")
    val sourceText: StateFlow<String> = _sourceText.asStateFlow()

    private val _targetLang = MutableStateFlow("العربية الفصحى المشرقة")
    val targetLang: StateFlow<String> = _targetLang.asStateFlow()

    private val _translatedText = MutableStateFlow<String?>(null)
    val translatedText: StateFlow<String?> = _translatedText.asStateFlow()

    private val _isTranslating = MutableStateFlow(false)
    val isTranslating: StateFlow<Boolean> = _isTranslating.asStateFlow()

    private var tts: TextToSpeech? = null

    fun initTts(context: Context) {
        if (tts == null) {
            tts = TextToSpeech(context.applicationContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.language = Locale("ar")
                }
            }
        }
    }

    fun setSubTab(tab: String) { _activeSubTab.value = tab }
    fun updateTtsText(text: String) { _ttsText.value = text }
    fun selectVoice(voiceId: String) { _selectedVoice.value = voiceId }

    fun playTts(textToPlay: String? = null) {
        val text = textToPlay ?: _ttsText.value
        if (text.isBlank()) return

        tts?.let {
            if (_isSpeaking.value) {
                it.stop()
                _isSpeaking.value = false
            } else {
                it.speak(text, TextToSpeech.QUEUE_FLUSH, null, "TTS_${System.currentTimeMillis()}")
                _isSpeaking.value = true

                // Save to list if new
                if (_savedAudios.value.none { item -> item.text == text }) {
                    val newItem = SavedAudioItem(
                        id = UUID.randomUUID().toString(),
                        text = text,
                        voice = if (_selectedVoice.value == "fusha_male") "فصيح - نبرة رخيمة" else "فصيحة - نبرة دافئة",
                        createdAt = "الآن"
                    )
                    _savedAudios.value = listOf(newItem) + _savedAudios.value
                }
            }
        }
    }

    fun stopTts() {
        tts?.stop()
        _isSpeaking.value = false
    }

    fun updateDraftText(text: String) { _draftText.value = text }
    fun updateRefineTone(tone: String) { _refineTone.value = tone }

    fun refineText() {
        if (_draftText.value.isBlank() || _isRefining.value) return
        _isRefining.value = true

        viewModelScope.launch {
            try {
                val result = repository.refineArabicText(_draftText.value, _refineTone.value)
                _refinedResult.value = result
            } finally {
                _isRefining.value = false
            }
        }
    }

    fun updateSourceText(text: String) { _sourceText.value = text }
    fun updateTargetLang(lang: String) { _targetLang.value = lang }

    fun translate() {
        if (_sourceText.value.isBlank() || _isTranslating.value) return
        _isTranslating.value = true

        viewModelScope.launch {
            try {
                val result = repository.translateText(_sourceText.value, _targetLang.value)
                _translatedText.value = result
            } finally {
                _isTranslating.value = false
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        tts?.stop()
        tts?.shutdown()
    }
}
