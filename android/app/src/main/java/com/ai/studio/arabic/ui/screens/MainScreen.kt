package com.ai.studio.arabic.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.ai.studio.arabic.ui.components.QuickTemplatesSheet
import com.ai.studio.arabic.ui.theme.*
import com.ai.studio.arabic.viewmodel.*

enum class AppTab(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    CHAT("المحادثة", Icons.Filled.ChatBubble, Icons.Outlined.ChatBubbleOutline),
    IMAGE("الصور", Icons.Filled.Image, Icons.Outlined.Image),
    VIDEO("الفيديو", Icons.Filled.Movie, Icons.Outlined.Movie),
    AUDIO("الصوت", Icons.Filled.GraphicEq, Icons.Outlined.GraphicEq),
    GALLERY("المعرض", Icons.Filled.Folder, Icons.Outlined.Folder)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    chatViewModel: ChatViewModel = viewModel(),
    imageViewModel: ImageViewModel = viewModel(),
    videoViewModel: VideoViewModel = viewModel(),
    audioViewModel: AudioViewModel = viewModel(),
    galleryViewModel: GalleryViewModel = viewModel()
) {
    var currentTab by remember { mutableStateOf(AppTab.CHAT) }
    var showTemplatesSheet by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(AccentBlue),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "منصة الذكاء الاصطناعي",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Gemini 2.5 • Imagen 3 • Veo 3.1",
                                fontSize = 10.sp,
                                color = AccentBlueLight
                            )
                        }
                    }
                },
                actions = {
                    // Quick Templates button
                    IconButton(
                        onClick = { showTemplatesSheet = true },
                        modifier = Modifier
                            .padding(end = 4.dp)
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(CardBg)
                            .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            Icons.Default.GridView,
                            contentDescription = "القوالب الجاهزة",
                            tint = AccentBlueLight,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SurfaceDark,
                    titleContentColor = TextPrimary
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = SurfaceDark,
                tonalElevation = 8.dp,
                modifier = Modifier.border(width = 1.dp, color = BorderDark)
            ) {
                AppTab.values().forEach { tab ->
                    val selected = currentTab == tab
                    NavigationBarItem(
                        selected = selected,
                        onClick = { currentTab = tab },
                        icon = {
                            Icon(
                                imageVector = if (selected) tab.selectedIcon else tab.unselectedIcon,
                                contentDescription = tab.title,
                                modifier = Modifier.size(20.dp)
                            )
                        },
                        label = {
                            Text(
                                text = tab.title,
                                fontSize = 11.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = AccentBlueLight,
                            selectedTextColor = AccentBlueLight,
                            unselectedIconColor = TextSecondary,
                            unselectedTextColor = TextSecondary,
                            indicatorColor = AccentBlue.copy(alpha = 0.15f)
                        )
                    )
                }
            }
        },
        containerColor = BgDark
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (currentTab) {
                AppTab.CHAT -> ChatScreen(viewModel = chatViewModel)
                AppTab.IMAGE -> ImageScreen(viewModel = imageViewModel)
                AppTab.VIDEO -> VideoScreen(viewModel = videoViewModel)
                AppTab.AUDIO -> AudioScreen(viewModel = audioViewModel)
                AppTab.GALLERY -> GalleryScreen(viewModel = galleryViewModel)
            }
        }

        if (showTemplatesSheet) {
            QuickTemplatesSheet(
                onDismiss = { showTemplatesSheet = false },
                onSelectTemplate = { template ->
                    when (template.targetTab) {
                        "chat" -> {
                            currentTab = AppTab.CHAT
                            chatViewModel.sendMessage(template.prompt)
                        }
                        "image" -> {
                            currentTab = AppTab.IMAGE
                            imageViewModel.updatePrompt(template.prompt)
                        }
                        "video" -> {
                            currentTab = AppTab.VIDEO
                            videoViewModel.updateTopic(template.prompt)
                        }
                        "audio" -> {
                            currentTab = AppTab.AUDIO
                            audioViewModel.setSubTab("refine")
                            audioViewModel.updateDraftText(template.prompt)
                        }
                    }
                }
            )
        }
    }
}
