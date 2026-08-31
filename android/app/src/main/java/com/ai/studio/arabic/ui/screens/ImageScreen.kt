package com.ai.studio.arabic.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.BitmapFactory
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ai.studio.arabic.ui.components.FilterChipCustom
import com.ai.studio.arabic.ui.components.StudioHeaderBanner
import com.ai.studio.arabic.ui.theme.*
import com.ai.studio.arabic.viewmodel.ImageViewModel

val STYLES = listOf(
    "سينمائي (Cinematic)",
    "واقعي فوتوغرافي",
    "رسم رقمي (Digital Art)",
    "فن الأنمي (Anime)",
    "فن إسلامي وزخارف",
    "فنتازي أسطوري",
    "سايبربانك (Cyberpunk)"
)

val ASPECT_RATIOS = listOf("1:1", "16:9", "9:16", "4:3", "3:4")

@Composable
fun ImageScreen(
    viewModel: ImageViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val prompt by viewModel.prompt.collectAsState()
    val selectedStyle by viewModel.selectedStyle.collectAsState()
    val selectedRatio by viewModel.selectedAspectRatio.collectAsState()
    val referenceImage by viewModel.referenceImage.collectAsState()
    val isGenerating by viewModel.isGenerating.collectAsState()
    val isEnhancing by viewModel.isEnhancing.collectAsState()
    val history by viewModel.history.collectAsState()

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            try {
                val inputStream = context.contentResolver.openInputStream(it)
                val bitmap = BitmapFactory.decodeStream(inputStream)
                viewModel.setReferenceImage(bitmap)
            } catch (e: Exception) {
                Toast.makeText(context, "تعذر قراءة الصورة", Toast.LENGTH_SHORT).show()
            }
        }
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
                icon = Icons.Default.Image,
                title = "استوديو توليد الصور الفنية",
                subtitle = "محرك توليد عالي الدقة يدعم الأنماط السينمائية والزخرفية"
            )
        }

        // Input Card
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
                        text = "وصف المشهد أو الفكرة المرئية:",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )

                    OutlinedTextField(
                        value = prompt,
                        onValueChange = { viewModel.updatePrompt(it) },
                        placeholder = {
                            Text(
                                "مثال: واحة أندلسية ساحرة في المساء تحت ضوء النجوم...",
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

                    // Enhance prompt button
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Button(
                            onClick = { viewModel.enhancePrompt() },
                            enabled = prompt.isNotBlank() && !isEnhancing,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = SurfaceDark,
                                contentColor = AccentBlueLight
                            ),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.border(1.dp, BorderDark, RoundedCornerShape(10.dp)),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Icon(
                                Icons.Default.AutoAwesome,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isEnhancing) "جاري التحسين..." else "تحسين الوصف بالذكاء الاصطناعي",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        // Reference image picker
                        IconButton(
                            onClick = { imagePickerLauncher.launch("image/*") },
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(SurfaceDark)
                                .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                        ) {
                            Icon(
                                Icons.Default.AddPhotoAlternate,
                                contentDescription = "صورة مرجعية",
                                tint = if (referenceImage != null) AccentBlueLight else TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    // Reference image preview if exists
                    referenceImage?.let { bmp ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Image(
                                bitmap = bmp.asImageBitmap(),
                                contentDescription = "الصورة المرجعية",
                                modifier = Modifier
                                    .size(50.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .border(1.dp, BorderDark, RoundedCornerShape(8.dp))
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = "تم إرفاق صورة مرجعية", fontSize = 11.sp, color = AccentBlueLight)
                            Spacer(modifier = Modifier.weight(1f))
                            IconButton(onClick = { viewModel.setReferenceImage(null) }) {
                                Icon(Icons.Default.Close, contentDescription = "حذف", tint = DangerRed, modifier = Modifier.size(16.dp))
                            }
                        }
                    }

                    // Style selector
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(text = "الأسلوب الفني:", fontSize = 12.sp, color = TextSecondary)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(STYLES) { style ->
                                FilterChipCustom(
                                    selected = selectedStyle == style,
                                    label = style,
                                    onClick = { viewModel.selectStyle(style) }
                                )
                            }
                        }
                    }

                    // Aspect ratio selector
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(text = "أبعاد الصورة:", fontSize = 12.sp, color = TextSecondary)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(ASPECT_RATIOS) { ratio ->
                                FilterChipCustom(
                                    selected = selectedRatio == ratio,
                                    label = ratio,
                                    onClick = { viewModel.selectAspectRatio(ratio) }
                                )
                            }
                        }
                    }

                    // Generate Button
                    Button(
                        onClick = { viewModel.generateImage() },
                        enabled = prompt.isNotBlank() && !isGenerating,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentBlue)
                    ) {
                        if (isGenerating) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("جاري الرسم والتوليد...", fontSize = 13.sp)
                        } else {
                            Icon(Icons.Default.Palette, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("توليد الصورة الفنية الآن", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // History / Results
        item {
            Text(
                text = "الصور المولدة وسجل الأعمال:",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        items(history, key = { it.id }) { img ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderDark, RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                color = CardBg
            ) {
                Column {
                    AsyncImage(
                        model = img.url,
                        contentDescription = img.prompt,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(240.dp)
                            .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)),
                        contentScale = ContentScale.Crop
                    )
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = img.prompt,
                            fontSize = 12.sp,
                            color = TextPrimary,
                            lineHeight = 18.sp
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${img.style} • ${img.aspectRatio}",
                                fontSize = 10.sp,
                                color = TextMuted
                            )
                            IconButton(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Image Prompt", img.prompt)
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "تم نسخ الوصف", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    Icons.Default.ContentCopy,
                                    contentDescription = "نسخ الوصف",
                                    tint = TextSecondary,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
