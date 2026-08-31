package com.ai.studio.arabic.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ai.studio.arabic.ui.components.FilterChipCustom
import com.ai.studio.arabic.ui.components.StudioHeaderBanner
import com.ai.studio.arabic.ui.theme.*
import com.ai.studio.arabic.viewmodel.VideoViewModel

val DURATIONS = listOf("15s", "30s", "60s", "90s")
val TONES = listOf("سينمائي وحماسي", "وثائقي ملهم", "تسويقي سريع", "درامي وعاطفي")

@Composable
fun VideoScreen(
    viewModel: VideoViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val topic by viewModel.topic.collectAsState()
    val duration by viewModel.duration.collectAsState()
    val tone by viewModel.tone.collectAsState()
    val isGeneratingStoryboard by viewModel.isGeneratingStoryboard.collectAsState()
    val storyboard by viewModel.storyboard.collectAsState()
    val currentSceneIndex by viewModel.currentSceneIndex.collectAsState()
    val isPlaying by viewModel.isPlaying.collectAsState()
    val progress by viewModel.progress.collectAsState()

    val veoPrompt by viewModel.veoPrompt.collectAsState()
    val veoAspectRatio by viewModel.veoAspectRatio.collectAsState()
    val veoResolution by viewModel.veoResolution.collectAsState()
    val isGeneratingVeo by viewModel.isGeneratingVeo.collectAsState()
    val veoStatusMessage by viewModel.veoStatusMessage.collectAsState()

    var activeTab by remember { mutableStateOf("storyboard") } // "storyboard" or "veo"

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Header
        item {
            StudioHeaderBanner(
                icon = Icons.Default.Movie,
                title = "استوديو الفيديو والسيناريو الذكي",
                subtitle = "توليد قصص مصورة ومحاكاة سينمائية متوافقة مع Google Veo 3.1"
            )
        }

        // Sub Tabs
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChipCustom(
                    selected = activeTab == "storyboard",
                    label = "القصة المصورة والسيناريو",
                    onClick = { activeTab = "storyboard" },
                    icon = Icons.Default.ViewTimeline,
                    modifier = Modifier.weight(1f)
                )
                FilterChipCustom(
                    selected = activeTab == "veo",
                    label = "توليد Veo 3.1 المباشر",
                    onClick = { activeTab = "veo" },
                    icon = Icons.Default.Videocam,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        if (activeTab == "storyboard") {
            // Storyboard Generator Input
            item {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderDark, RoundedCornerShape(16.dp)),
                    shape = RoundedCornerShape(16.dp),
                    color = CardBg
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "فكرة أو موضوع الفيديو:",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )

                        OutlinedTextField(
                            value = topic,
                            onValueChange = { viewModel.updateTopic(it) },
                            placeholder = {
                                Text(
                                    "مثال: إعلان ملهم عن مستقبل استكشاف الفضاء والطاقة المتجددة في الشرق الأوسط...",
                                    fontSize = 12.sp,
                                    color = TextMuted
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = InputBg,
                                unfocusedContainerColor = InputBg,
                                focusedBorderColor = AccentBlue,
                                unfocusedBorderColor = BorderDark,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )

                        // Duration selector
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(text = "المدة الزمنية:", fontSize = 12.sp, color = TextSecondary)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(DURATIONS) { d ->
                                    FilterChipCustom(
                                        selected = duration == d,
                                        label = d,
                                        onClick = { viewModel.updateDuration(d) }
                                    )
                                }
                            }
                        }

                        // Tone selector
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(text = "الأسلوب السينمائي:", fontSize = 12.sp, color = TextSecondary)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(TONES) { t ->
                                    FilterChipCustom(
                                        selected = tone == t,
                                        label = t,
                                        onClick = { viewModel.updateTone(t) }
                                    )
                                }
                            }
                        }

                        // Submit button
                        Button(
                            onClick = { viewModel.generateStoryboard() },
                            enabled = topic.isNotBlank() && !isGeneratingStoryboard,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AccentBlue)
                        ) {
                            if (isGeneratingStoryboard) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("جاري كتابة وتخطيط المشاهد...", fontSize = 13.sp)
                            } else {
                                Icon(Icons.Default.AutoFixHigh, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("إنشاء السيناريو والقصة المصورة", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Cinematic Simulator Player
            storyboard?.let { sb ->
                val currentScene = sb.scenes.getOrNull(currentSceneIndex) ?: sb.scenes.firstOrNull()

                item {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderDark, RoundedCornerShape(16.dp)),
                        shape = RoundedCornerShape(16.dp),
                        color = SurfaceDark
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = sb.title,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Surface(
                                    color = AccentBlue.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = sb.totalDuration,
                                        fontSize = 10.sp,
                                        color = AccentBlueLight,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            // Simulation Canvas
                            currentScene?.let { sc ->
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(180.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(
                                            Brush.verticalGradient(
                                                listOf(
                                                    Color(0xFF1E3A8A),
                                                    Color(0xFF0F172A),
                                                    Color(0xFF0A0C10)
                                                )
                                            )
                                        )
                                        .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
                                        .padding(12.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxSize(),
                                        verticalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Surface(
                                                color = Color.Black.copy(alpha = 0.6f),
                                                shape = RoundedCornerShape(6.dp)
                                            ) {
                                                Text(
                                                    text = "مشهد ${sc.sceneNumber} (${sc.timestamp})",
                                                    fontSize = 11.sp,
                                                    color = Color.White,
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                                )
                                            }
                                            Surface(
                                                color = Color.Black.copy(alpha = 0.6f),
                                                shape = RoundedCornerShape(6.dp)
                                            ) {
                                                Text(
                                                    text = sc.cameraAngle,
                                                    fontSize = 11.sp,
                                                    color = AccentBlueLight,
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                                )
                                            }
                                        }

                                        // Voiceover Subtitle
                                        Surface(
                                            color = Color.Black.copy(alpha = 0.75f),
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text(
                                                text = "🎙️ \"${sc.voiceoverArabic}\"",
                                                fontSize = 12.sp,
                                                color = TextPrimary,
                                                modifier = Modifier.padding(8.dp),
                                                lineHeight = 18.sp
                                            )
                                        }
                                    }
                                }
                            }

                            // Player Controls
                            LinearProgressIndicator(
                                progress = { progress / 100f },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp)),
                                color = AccentBlue,
                                trackColor = BorderDark
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                IconButton(onClick = { viewModel.previousScene() }) {
                                    Icon(Icons.Default.SkipPrevious, contentDescription = "السابق", tint = TextPrimary)
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                IconButton(
                                    onClick = { viewModel.togglePlay() },
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                        .background(AccentBlue)
                                ) {
                                    Icon(
                                        imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                        contentDescription = "تشغيل",
                                        tint = Color.White
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                IconButton(onClick = { viewModel.nextScene() }) {
                                    Icon(Icons.Default.SkipNext, contentDescription = "التالي", tint = TextPrimary)
                                }
                            }
                        }
                    }
                }

                // Scenes List Breakdown
                item {
                    Text(
                        text = "تفاصيل المشاهد وأوامر Veo 3.1:",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                itemsIndexed(sb.scenes) { idx, sc ->
                    val isSelected = currentSceneIndex == idx
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .clickable { viewModel.selectScene(idx) }
                            .border(
                                1.dp,
                                if (isSelected) AccentBlue else BorderDark,
                                RoundedCornerShape(14.dp)
                            ),
                        shape = RoundedCornerShape(14.dp),
                        color = if (isSelected) SurfaceDark else CardBg
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "المشهد ${sc.sceneNumber} (${sc.timestamp})",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) AccentBlueLight else TextPrimary
                                )
                                IconButton(
                                    onClick = {
                                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                        val clip = ClipData.newPlainText("Veo Prompt", sc.veoPromptEnglish)
                                        clipboard.setPrimaryClip(clip)
                                        Toast.makeText(context, "تم نسخ أمر Veo بالإنجليزية", Toast.LENGTH_SHORT).show()
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.ContentCopy,
                                        contentDescription = "نسخ",
                                        tint = TextSecondary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }

                            Text(
                                text = sc.visualDescription,
                                fontSize = 12.sp,
                                color = TextPrimary,
                                lineHeight = 18.sp
                            )

                            Surface(
                                color = InputBg,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                            ) {
                                Text(
                                    text = "Veo 3.1 Prompt: ${sc.veoPromptEnglish}",
                                    fontSize = 11.sp,
                                    color = TextSecondary,
                                    modifier = Modifier.padding(8.dp),
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }
                }
            }
        } else {
            // Veo Generator direct tab
            item {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderDark, RoundedCornerShape(16.dp)),
                    shape = RoundedCornerShape(16.dp),
                    color = CardBg
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "أمر التوليد السينمائي لنموذج Veo 3.1:",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )

                        OutlinedTextField(
                            value = veoPrompt,
                            onValueChange = { viewModel.updateVeoPrompt(it) },
                            placeholder = {
                                Text(
                                    "A hyper-realistic 4K drone shot soaring over desert sand dunes into a glowing neon oasis...",
                                    fontSize = 12.sp,
                                    color = TextMuted
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 3,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = InputBg,
                                unfocusedContainerColor = InputBg,
                                focusedBorderColor = AccentBlue,
                                unfocusedBorderColor = BorderDark,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(text = "الأبعاد:", fontSize = 11.sp, color = TextSecondary)
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    listOf("16:9", "9:16").forEach { ratio ->
                                        FilterChipCustom(
                                            selected = veoAspectRatio == ratio,
                                            label = ratio,
                                            onClick = { viewModel.selectVeoAspectRatio(ratio) }
                                        )
                                    }
                                }
                            }
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(text = "الدقة:", fontSize = 11.sp, color = TextSecondary)
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    listOf("1080p", "720p").forEach { res ->
                                        FilterChipCustom(
                                            selected = veoResolution == res,
                                            label = res,
                                            onClick = { viewModel.selectVeoResolution(res) }
                                        )
                                    }
                                }
                            }
                        }

                        Button(
                            onClick = { viewModel.generateVeoVideo() },
                            enabled = veoPrompt.isNotBlank() && !isGeneratingVeo,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AccentBlue)
                        ) {
                            if (isGeneratingVeo) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("جاري معالجة إطارات الفيديو...", fontSize = 13.sp)
                            } else {
                                Icon(Icons.Default.Videocam, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("توليد مقطع Veo 3.1", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        veoStatusMessage?.let { status ->
                            Surface(
                                color = SurfaceDark,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                            ) {
                                Text(
                                    text = status,
                                    fontSize = 12.sp,
                                    color = AccentBlueLight,
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
