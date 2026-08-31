package com.ai.studio.arabic.viewmodel

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ai.studio.arabic.data.models.GeneratedImageItem
import com.ai.studio.arabic.data.repository.GeminiRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.UUID

class ImageViewModel(private val repository: GeminiRepository = GeminiRepository()) : ViewModel() {

    private val _prompt = MutableStateFlow("")
    val prompt: StateFlow<String> = _prompt.asStateFlow()

    private val _selectedStyle = MutableStateFlow("سينمائي (Cinematic)")
    val selectedStyle: StateFlow<String> = _selectedStyle.asStateFlow()

    private val _selectedAspectRatio = MutableStateFlow("1:1")
    val selectedAspectRatio: StateFlow<String> = _selectedAspectRatio.asStateFlow()

    private val _referenceImage = MutableStateFlow<Bitmap?>(null)
    val referenceImage: StateFlow<Bitmap?> = _referenceImage.asStateFlow()

    private val _isGenerating = MutableStateFlow(false)
    val isGenerating: StateFlow<Boolean> = _isGenerating.asStateFlow()

    private val _isEnhancing = MutableStateFlow(false)
    val isEnhancing: StateFlow<Boolean> = _isEnhancing.asStateFlow()

    private val _history = MutableStateFlow<List<GeneratedImageItem>>(
        listOf(
            GeneratedImageItem(
                id = "demo_1",
                url = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
                prompt = "قلعة إسلامية أندلسية مهيبة محاطة بحدائق وأشجار النخيل عند الغسق، تفاصيل سينمائية 4K",
                style = "سينمائي (Cinematic)",
                aspectRatio = "16:9",
                createdAt = "سابقاً"
            )
        )
    )
    val history: StateFlow<List<GeneratedImageItem>> = _history.asStateFlow()

    fun updatePrompt(newPrompt: String) {
        _prompt.value = newPrompt
    }

    fun selectStyle(style: String) {
        _selectedStyle.value = style
    }

    fun selectAspectRatio(ratio: String) {
        _selectedAspectRatio.value = ratio
    }

    fun setReferenceImage(bitmap: Bitmap?) {
        _referenceImage.value = bitmap
    }

    fun enhancePrompt() {
        if (_prompt.value.isBlank() || _isEnhancing.value) return
        _isEnhancing.value = true

        viewModelScope.launch {
            try {
                val enhanced = repository.enhanceImagePrompt(_prompt.value, _selectedStyle.value)
                _prompt.value = enhanced
            } catch (e: Exception) {
                // Keep original
            } finally {
                _isEnhancing.value = false
            }
        }
    }

    fun generateImage() {
        if (_prompt.value.isBlank() || _isGenerating.value) return
        _isGenerating.value = true

        viewModelScope.launch {
            try {
                // Enhance prompt internally to get best visual prompt
                val visualPrompt = repository.enhanceImagePrompt(_prompt.value, _selectedStyle.value)
                val encodedPrompt = URLEncoder.encode(visualPrompt, StandardCharsets.UTF_8.toString())

                val (width, height) = when (_selectedAspectRatio.value) {
                    "16:9" -> Pair(1280, 720)
                    "9:16" -> Pair(720, 1280)
                    "4:3" -> Pair(1024, 768)
                    "3:4" -> Pair(768, 1024)
                    else -> Pair(1024, 1024)
                }

                val imageUrl = "https://image.pollinations.ai/prompt/$encodedPrompt?width=$width&height=$height&nologo=true&seed=${(1000..999999).random()}"

                val newItem = GeneratedImageItem(
                    id = UUID.randomUUID().toString(),
                    url = imageUrl,
                    prompt = _prompt.value,
                    style = _selectedStyle.value,
                    aspectRatio = _selectedAspectRatio.value,
                    createdAt = "الآن"
                )

                _history.value = listOf(newItem) + _history.value
            } catch (e: Exception) {
                // Error handling
            } finally {
                _isGenerating.value = false
            }
        }
    }
}
