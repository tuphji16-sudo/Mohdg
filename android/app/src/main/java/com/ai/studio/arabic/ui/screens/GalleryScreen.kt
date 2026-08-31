package com.ai.studio.arabic.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ai.studio.arabic.ui.components.FilterChipCustom
import com.ai.studio.arabic.ui.components.StudioHeaderBanner
import com.ai.studio.arabic.ui.theme.*
import com.ai.studio.arabic.viewmodel.GalleryViewModel

@Composable
fun GalleryScreen(
    viewModel: GalleryViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val activeFilter by viewModel.activeFilter.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val images by viewModel.images.collectAsState()
    val storyboards by viewModel.storyboards.collectAsState()
    val audios by viewModel.audios.collectAsState()

    val filteredImages = remember(images, searchQuery) {
        if (searchQuery.isBlank()) images
        else images.filter { it.prompt.contains(searchQuery, ignoreCase = true) }
    }

    val filteredAudios = remember(audios, searchQuery) {
        if (searchQuery.isBlank()) audios
        else audios.filter { it.text.contains(searchQuery, ignoreCase = true) }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header
        item {
            StudioHeaderBanner(
                icon = Icons.Default.Folder,
                title = "المعرض والمحفوظات السابقة",
                subtitle = "سجل الأعمال والوسائط المنشأة في كافة استوديوهات المنصة"
            )
        }

        // Search Bar
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                placeholder = { Text("بحث في المحفوظات...", fontSize = 12.sp, color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp)) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = SurfaceDark,
                    unfocusedContainerColor = SurfaceDark,
                    focusedBorderColor = AccentBlue,
                    unfocusedBorderColor = BorderDark,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
        }

        // Filter Pills
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    FilterChipCustom(
                        selected = activeFilter == "all",
                        label = "الكل (${filteredImages.size + filteredAudios.size})",
                        onClick = { viewModel.setFilter("all") }
                    )
                }
                item {
                    FilterChipCustom(
                        selected = activeFilter == "images",
                        label = "الصور (${filteredImages.size})",
                        onClick = { viewModel.setFilter("images") },
                        icon = Icons.Default.Image
                    )
                }
                item {
                    FilterChipCustom(
                        selected = activeFilter == "audios",
                        label = "الصوتيات (${filteredAudios.size})",
                        onClick = { viewModel.setFilter("audios") },
                        icon = Icons.Default.VolumeUp
                    )
                }
            }
        }

        // Images Section
        if (activeFilter == "all" || activeFilter == "images") {
            item {
                Text(
                    text = "الصور المحفوظة:",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            if (filteredImages.isEmpty()) {
                item {
                    Text(
                        text = "لا توجد صور محفوظة مطابقة للبحث.",
                        fontSize = 12.sp,
                        color = TextMuted,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
            } else {
                items(filteredImages, key = { it.id }) { img ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderDark, RoundedCornerShape(14.dp)),
                        shape = RoundedCornerShape(14.dp),
                        color = CardBg
                    ) {
                        Column {
                            AsyncImage(
                                model = img.url,
                                contentDescription = img.prompt,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(180.dp)
                                    .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)),
                                contentScale = ContentScale.Crop
                            )
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = img.prompt,
                                        fontSize = 12.sp,
                                        color = TextPrimary,
                                        maxLines = 2
                                    )
                                    Text(
                                        text = "${img.style} • ${img.createdAt}",
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                }
                                Row {
                                    IconButton(
                                        onClick = {
                                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                            val clip = ClipData.newPlainText("Image Prompt", img.prompt)
                                            clipboard.setPrimaryClip(clip)
                                            Toast.makeText(context, "تم نسخ الوصف", Toast.LENGTH_SHORT).show()
                                        }
                                    ) {
                                        Icon(Icons.Default.ContentCopy, contentDescription = "نسخ", tint = TextSecondary, modifier = Modifier.size(16.dp))
                                    }
                                    IconButton(onClick = { viewModel.deleteImage(img.id) }) {
                                        Icon(Icons.Default.Delete, contentDescription = "حذف", tint = DangerRed, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Audios Section
        if (activeFilter == "all" || activeFilter == "audios") {
            item {
                Text(
                    text = "المقتطفات الصوتية المحفوظة:",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            if (filteredAudios.isEmpty()) {
                item {
                    Text(
                        text = "لا توجد مقتطفات صوتية محفوظة.",
                        fontSize = 12.sp,
                        color = TextMuted,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
            } else {
                items(filteredAudios, key = { it.id }) { aud ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderDark, RoundedCornerShape(14.dp)),
                        shape = RoundedCornerShape(14.dp),
                        color = CardBg
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = aud.text,
                                    fontSize = 12.sp,
                                    color = TextPrimary,
                                    maxLines = 2
                                )
                                Text(
                                    text = "${aud.voice} • ${aud.createdAt}",
                                    fontSize = 10.sp,
                                    color = TextMuted
                                )
                            }
                            IconButton(onClick = { viewModel.deleteAudio(aud.id) }) {
                                Icon(Icons.Default.Delete, contentDescription = "حذف", tint = DangerRed, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
