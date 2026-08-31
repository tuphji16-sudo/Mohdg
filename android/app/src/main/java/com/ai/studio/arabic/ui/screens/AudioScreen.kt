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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ai.studio.arabic.ui.components.FilterChipCustom
import com.ai.studio.arabic.ui.components.StudioHeaderBanner
import com.ai.studio.arabic.ui.theme.*
import com.ai.studio.arabic.viewmodel.AudioViewModel

val REFINE_TONES = listOf("فصيح وبليغ", "رسمي وإداري", "معاصر ومبسط", "أدبي وشعري")
val TARGET_LANGUAGES = listOf("العربية الفصحى المشرقة", "English (Academic)", "Français", "Español", "Türkçe")

@Composable
fun AudioScreen(
    viewModel: AudioViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val activeSubTab by viewModel.activeSubTab.collectAsState()
    val ttsText by viewModel.ttsText.collectAsState()
    val selectedVoice by viewModel.selectedVoice.collectAsState()
    val isSpeaking by viewModel.isSpeaking.collectAsState()
    val savedAudios by viewModel.savedAudios.collectAsState()

    val draftText by viewModel.draftText.collectAsState()
    val refineTone by viewModel.refineTone.collectAsState()
    val refinedResult by viewModel.refinedResult.collectAsState()
    val isRefining by viewModel.isRefining.collectAsState()

    val sourceText by viewModel.sourceText.collectAsState()
    val targetLang by viewModel.targetLang.collectAsState()
    val translatedText by viewModel.translatedText.collectAsState()
    val isTranslating by viewModel.isTranslating.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.initTts(context)
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
                icon = Icons.Default.GraphicEq,
                title = "استوديو الصوت والفصاحة اللغوية",
                subtitle = "النطق الصوتي الطبيعي، التدقيق البلاغي، والترجمة السياقية الفائقة"
            )
        }

        // Sub Tabs
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChipCustom(
                    selected = activeSubTab == "tts",
                    label = "النطق الصوتي (TTS)",
                    onClick = { viewModel.setSubTab("tts") },
                    icon = Icons.Default.VolumeUp,
                    modifier = Modifier.weight(1f)
                )
                FilterChipCustom(
                    selected = activeSubTab == "refine",
                    label = "التدقيق والبلاغة",
                    onClick = { viewModel.setSubTab("refine") },
                    icon = Icons.Default.Spellcheck,
                    modifier = Modifier.weight(1f)
                )
                FilterChipCustom(
                    selected = activeSubTab == "translate",
                    label = "الترجمة السياقية",
                    onClick = { viewModel.setSubTab("translate") },
                    icon = Icons.Default.Translate,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        when (activeSubTab) {
            "tts" -> {
                // Text to Speech
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
                                text = "النص المراد نطقه صوتياً:",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )

                            OutlinedTextField(
                                value = ttsText,
                                onValueChange = { viewModel.updateTtsText(it) },
                                placeholder = { Text("اكتب أو الصق النص هنا...", fontSize = 12.sp, color = TextMuted) },
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

                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(text = "النبرة الصوتية:", fontSize = 12.sp, color = TextSecondary)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    FilterChipCustom(
                                        selected = selectedVoice == "fusha_male",
                                        label = "فصيح (نبرة رخيمة)",
                                        onClick = { viewModel.selectVoice("fusha_male") }
                                    )
                                    FilterChipCustom(
                                        selected = selectedVoice == "fusha_female",
                                        label = "فصيحة (نبرة دافئة)",
                                        onClick = { viewModel.selectVoice("fusha_female") }
                                    )
                                }
                            }

                            Button(
                                onClick = {
                                    if (isSpeaking) viewModel.stopTts() else viewModel.playTts()
                                },
                                enabled = ttsText.isNotBlank(),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(46.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isSpeaking) DangerRed else AccentBlue
                                )
                            ) {
                                Icon(
                                    imageVector = if (isSpeaking) Icons.Default.Stop else Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = if (isSpeaking) "إيقاف النطق الصوتي" else "استماع للنطق الفصيح",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                // History
                item {
                    Text(
                        text = "المقتطفات الصوتية السابقة:",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 6.dp)
                    )
                }

                items(savedAudios, key = { it.id }) { aud ->
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
                            IconButton(onClick = { viewModel.playTts(aud.text) }) {
                                Icon(Icons.Default.PlayCircle, contentDescription = "تشغيل", tint = AccentBlueLight)
                            }
                        }
                    }
                }
            }

            "refine" -> {
                // Proofreading & Rhetoric Refinement
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
                                text = "النص المراد تدقيقه وتجويد بلاغته:",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )

                            OutlinedTextField(
                                value = draftText,
                                onValueChange = { viewModel.updateDraftText(it) },
                                placeholder = { Text("اكتب أو الصق المسودة هنا للتدقيق النحوي والبلاغي...", fontSize = 12.sp, color = TextMuted) },
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

                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(text = "الأسلوب البلاغي المطلوب:", fontSize = 12.sp, color = TextSecondary)
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    items(REFINE_TONES) { tone ->
                                        FilterChipCustom(
                                            selected = refineTone == tone,
                                            label = tone,
                                            onClick = { viewModel.updateRefineTone(tone) }
                                        )
                                    }
                                }
                            }

                            Button(
                                onClick = { viewModel.refineText() },
                                enabled = draftText.isNotBlank() && !isRefining,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(46.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentBlue)
                            ) {
                                if (isRefining) {
                                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("جاري التدقيق اللغوي والبلاغي...", fontSize = 13.sp)
                                } else {
                                    Icon(Icons.Default.Spellcheck, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("تدقيق وتجويد الصياغة الآن", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                            }

                            refinedResult?.let { res ->
                                Surface(
                                    color = SurfaceDark,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
                                ) {
                                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(text = "النص المحسن والمدقق:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = AccentBlueLight)
                                            IconButton(
                                                onClick = {
                                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                                    val clip = ClipData.newPlainText("Refined Text", res)
                                                    clipboard.setPrimaryClip(clip)
                                                    Toast.makeText(context, "تم النسخ بنجاح", Toast.LENGTH_SHORT).show()
                                                },
                                                modifier = Modifier.size(28.dp)
                                            ) {
                                                Icon(Icons.Default.ContentCopy, contentDescription = "نسخ", tint = TextSecondary, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                        Text(text = res, fontSize = 12.sp, lineHeight = 20.sp, color = TextPrimary)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            "translate" -> {
                // Contextual Translation
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
                                text = "النص المراد ترجمته:",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )

                            OutlinedTextField(
                                value = sourceText,
                                onValueChange = { viewModel.updateSourceText(it) },
                                placeholder = { Text("اكتب أو الصق النص بأي لغة للترجمة الأدبية والسياقية...", fontSize = 12.sp, color = TextMuted) },
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

                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(text = "اللغة الهدف:", fontSize = 12.sp, color = TextSecondary)
                                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    items(TARGET_LANGUAGES) { lang ->
                                        FilterChipCustom(
                                            selected = targetLang == lang,
                                            label = lang,
                                            onClick = { viewModel.updateTargetLang(lang) }
                                        )
                                    }
                                }
                            }

                            Button(
                                onClick = { viewModel.translate() },
                                enabled = sourceText.isNotBlank() && !isTranslating,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(46.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentBlue)
                            ) {
                                if (isTranslating) {
                                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("جاري الترجمة السياقية...", fontSize = 13.sp)
                                } else {
                                    Icon(Icons.Default.Translate, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("ترجمة النص باحترافية", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                            }

                            translatedText?.let { res ->
                                Surface(
                                    color = SurfaceDark,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, BorderDark, RoundedCornerShape(12.dp))
                                ) {
                                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(text = "الترجمة الدقيقة:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = AccentBlueLight)
                                            IconButton(
                                                onClick = {
                                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                                    val clip = ClipData.newPlainText("Translated Text", res)
                                                    clipboard.setPrimaryClip(clip)
                                                    Toast.makeText(context, "تم النسخ بنجاح", Toast.LENGTH_SHORT).show()
                                                },
                                                modifier = Modifier.size(28.dp)
                                            ) {
                                                Icon(Icons.Default.ContentCopy, contentDescription = "نسخ", tint = TextSecondary, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                        Text(text = res, fontSize = 12.sp, lineHeight = 20.sp, color = TextPrimary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
