package com.ai.studio.arabic.viewmodel

import androidx.lifecycle.ViewModel
import com.ai.studio.arabic.data.models.GeneratedImageItem
import com.ai.studio.arabic.data.models.SavedAudioItem
import com.ai.studio.arabic.data.models.StoryboardItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class GalleryViewModel : ViewModel() {

    private val _activeFilter = MutableStateFlow("all")
    val activeFilter: StateFlow<String> = _activeFilter.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _images = MutableStateFlow<List<GeneratedImageItem>>(
        listOf(
            GeneratedImageItem(
                id = "img_1",
                url = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
                prompt = "قلعة إسلامية أندلسية مهيبة محاطة بحدائق وأشجار النخيل عند الغسق",
                style = "سينمائي",
                aspectRatio = "16:9",
                createdAt = "اليوم"
            ),
            GeneratedImageItem(
                id = "img_2",
                url = "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=80",
                prompt = "لوحة فنية رقمية لطائر العنقاء الذهبي محلقاً في سماء النجوم",
                style = "فن رقمي",
                aspectRatio = "1:1",
                createdAt = "أمس"
            )
        )
    )
    val images: StateFlow<List<GeneratedImageItem>> = _images.asStateFlow()

    private val _storyboards = MutableStateFlow<List<StoryboardItem>>(emptyList())
    val storyboards: StateFlow<List<StoryboardItem>> = _storyboards.asStateFlow()

    private val _audios = MutableStateFlow<List<SavedAudioItem>>(
        listOf(
            SavedAudioItem(
                id = "aud_1",
                text = "اللغة العربية هي لغة الفصاحة والبيان، تزخر بالجمال والدقة التعبيرية.",
                voice = "فصيح - نبرة رخيمة",
                createdAt = "اليوم"
            )
        )
    )
    val audios: StateFlow<List<SavedAudioItem>> = _audios.asStateFlow()

    fun setFilter(filter: String) { _activeFilter.value = filter }
    fun setSearchQuery(query: String) { _searchQuery.value = query }

    fun deleteImage(id: String) {
        _images.value = _images.value.filter { it.id != id }
    }

    fun deleteStoryboard(id: String) {
        _storyboards.value = _storyboards.value.filter { it.id != id }
    }

    fun deleteAudio(id: String) {
        _audios.value = _audios.value.filter { it.id != id }
    }
}
