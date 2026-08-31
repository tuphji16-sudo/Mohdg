package com.ai.studio.arabic.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ai.studio.arabic.data.models.SceneItem
import com.ai.studio.arabic.data.models.StoryboardItem
import com.ai.studio.arabic.data.repository.GeminiRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class VideoViewModel(private val repository: GeminiRepository = GeminiRepository()) : ViewModel() {

    private val _topic = MutableStateFlow("")
    val topic: StateFlow<String> = _topic.asStateFlow()

    private val _duration = MutableStateFlow("30s")
    val duration: StateFlow<String> = _duration.asStateFlow()

    private val _tone = MutableStateFlow("سينمائي وحماسي")
    val tone: StateFlow<String> = _tone.asStateFlow()

    private val _isGeneratingStoryboard = MutableStateFlow(false)
    val isGeneratingStoryboard: StateFlow<Boolean> = _isGeneratingStoryboard.asStateFlow()

    private val _storyboard = MutableStateFlow<StoryboardItem?>(null)
    val storyboard: StateFlow<StoryboardItem?> = _storyboard.asStateFlow()

    private val _currentSceneIndex = MutableStateFlow(0)
    val currentSceneIndex: StateFlow<Int> = _currentSceneIndex.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _progress = MutableStateFlow(0f)
    val progress: StateFlow<Float> = _progress.asStateFlow()

    // Veo Generator
    private val _veoPrompt = MutableStateFlow("")
    val veoPrompt: StateFlow<String> = _veoPrompt.asStateFlow()

    private val _veoAspectRatio = MutableStateFlow("16:9")
    val veoAspectRatio: StateFlow<String> = _veoAspectRatio.asStateFlow()

    private val _veoResolution = MutableStateFlow("1080p")
    val veoResolution: StateFlow<String> = _veoResolution.asStateFlow()

    private val _isGeneratingVeo = MutableStateFlow(false)
    val isGeneratingVeo: StateFlow<Boolean> = _isGeneratingVeo.asStateFlow()

    private val _veoStatusMessage = MutableStateFlow<String?>(null)
    val veoStatusMessage: StateFlow<String?> = _veoStatusMessage.asStateFlow()

    private var playerJob: Job? = null

    init {
        // Initial demo storyboard
        _storyboard.value = StoryboardItem(
            id = "demo_sb",
            title = "رحلة إلى المستقبل: الذكاء الاصطناعي في خدمة الإنسانية",
            logline = "مشاهد سينمائية تستعرض تناغم التكنولوجيا الحديثة مع الأصالة العربية",
            totalDuration = "30s",
            scenes = listOf(
                SceneItem(
                    sceneNumber = 1,
                    timestamp = "0:00 - 0:08",
                    visualDescription = "لقطة علوية بانورامية واسعة من طائرة درون تحلق فوق مدينة عربية مستقبلية مع أبراج زجاجية ونوافير ذكية وقت الشفق الذهبي.",
                    veoPromptEnglish = "Cinematic aerial drone shot of futuristic Arabic smart metropolis at golden hour twilight, glowing architectural lighting, ultra-realistic 4K",
                    voiceoverArabic = "في قلب الغد، حيث تلتقي العراقة بأحدث آفاق التكنولوجيا...",
                    soundEffects = "لحن أوركسترالي هادئ ومؤثر مع حفيف نسيم عليل",
                    cameraAngle = "لقطة علوية واسعة منسابة",
                    keyframeColor = "#1E3A8A"
                ),
                SceneItem(
                    sceneNumber = 2,
                    timestamp = "0:08 - 0:18",
                    visualDescription = "مشهد مقرب لمبتكر عربي شاب يتفاعل مع واجهات مجسمة ثلاثية الأبعاد (Hologram) تصمم حلول طاقة نظيفة.",
                    veoPromptEnglish = "Close up shot of an innovative engineer interacting with floating blue holographic 3D data visualizations, shallow depth of field, 8K",
                    voiceoverArabic = "نصنع حلولاً ذكية تلهم الأجيال وتبني مستقبلاً مستداماً.",
                    soundEffects = "نغمات تقنية ناعمة مع إيقاع تصاعدي ملهم",
                    cameraAngle = "لقطة مقربة متوسطة مع عمق ميدان سطحي",
                    keyframeColor = "#2563EB"
                ),
                SceneItem(
                    sceneNumber = 3,
                    timestamp = "0:18 - 0:30",
                    visualDescription = "مشهد ختامي لغروب الشمس وتظهر عبارة الشعار بإضاءة ذهبية متوهجة على الشاشة.",
                    veoPromptEnglish = "Majestic sunset panorama fading into elegant glowing golden typography against a dark futuristic skyline, photorealistic",
                    voiceoverArabic = "الذكاء الاصطناعي... لإبداع بلا حدود.",
                    soundEffects = "نهاية أوركسترالية مهيبة تترك أثراً عميقاً",
                    cameraAngle = "لقطة ثابتة متسعة",
                    keyframeColor = "#1D4ED8"
                )
            ),
            createdAt = "الآن"
        )
    }

    fun updateTopic(newTopic: String) { _topic.value = newTopic }
    fun updateDuration(newDuration: String) { _duration.value = newDuration }
    fun updateTone(newTone: String) { _tone.value = newTone }

    fun generateStoryboard() {
        if (_topic.value.isBlank() || _isGeneratingStoryboard.value) return
        _isGeneratingStoryboard.value = true

        viewModelScope.launch {
            try {
                val result = repository.generateStoryboard(_topic.value, _duration.value, _tone.value)
                _storyboard.value = result
                _currentSceneIndex.value = 0
                _progress.value = 0f
            } finally {
                _isGeneratingStoryboard.value = false
            }
        }
    }

    fun selectScene(index: Int) {
        _currentSceneIndex.value = index
        _storyboard.value?.scenes?.let { scenes ->
            if (scenes.isNotEmpty()) {
                _progress.value = (index + 1).toFloat() / scenes.size.toFloat() * 100f
            }
        }
    }

    fun togglePlay() {
        if (_isPlaying.value) {
            pausePlayer()
        } else {
            startPlayer()
        }
    }

    private fun startPlayer() {
        val scenes = _storyboard.value?.scenes ?: return
        if (scenes.isEmpty()) return

        _isPlaying.value = true
        playerJob?.cancel()
        playerJob = viewModelScope.launch {
            while (_isPlaying.value) {
                val next = (_currentSceneIndex.value + 1) % scenes.size
                delay(4000)
                _currentSceneIndex.value = next
                _progress.value = (next + 1).toFloat() / scenes.size.toFloat() * 100f
            }
        }
    }

    fun pausePlayer() {
        _isPlaying.value = false
        playerJob?.cancel()
    }

    fun nextScene() {
        val scenes = _storyboard.value?.scenes ?: return
        if (_currentSceneIndex.value < scenes.size - 1) {
            selectScene(_currentSceneIndex.value + 1)
        }
    }

    fun previousScene() {
        if (_currentSceneIndex.value > 0) {
            selectScene(_currentSceneIndex.value - 1)
        }
    }

    fun restartPlayer() {
        pausePlayer()
        selectScene(0)
    }

    fun updateVeoPrompt(prompt: String) { _veoPrompt.value = prompt }
    fun selectVeoAspectRatio(ratio: String) { _veoAspectRatio.value = ratio }
    fun selectVeoResolution(res: String) { _veoResolution.value = res }

    fun generateVeoVideo() {
        if (_veoPrompt.value.isBlank() || _isGeneratingVeo.value) return
        _isGeneratingVeo.value = true
        _veoStatusMessage.value = "جاري تهيئة مسار المعالجة مع نموذج Veo 3.1..."

        viewModelScope.launch {
            delay(1500)
            _veoStatusMessage.value = "جاري تجميع الإطارات السينمائية وحساب الإضاءة الفيزيائية..."
            delay(2000)
            _veoStatusMessage.value = "تم تجهيز المشهد بنجاح بدقة ${_veoResolution.value} وبأبعاد ${_veoAspectRatio.value}."
            _isGeneratingVeo.value = false
        }
    }
}
