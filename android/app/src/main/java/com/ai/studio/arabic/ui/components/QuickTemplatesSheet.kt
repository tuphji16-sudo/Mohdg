package com.ai.studio.arabic.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ai.studio.arabic.data.models.QuickTemplate
import com.ai.studio.arabic.ui.theme.*

val SAMPLE_TEMPLATES = listOf(
    QuickTemplate(
        id = "t1",
        title = "تحليل وتلخيص نص معقد",
        description = "استخراج النقاط الجوهرية والقرارات الأساسية بأسلوب تنفيذي موجز",
        category = "كتابة وبحوث",
        prompt = "قم بقراءة النص التالي وتلخيصه في 5 نقاط رئيسية محددة مع إبراز التوصيات العملية:",
        targetTab = "chat"
    ),
    QuickTemplate(
        id = "t2",
        title = "صورة سينمائية لمستقبل عربي",
        description = "توليد مشهد لأبراج معمارية ذكية ذات طابع إسلامي حديث",
        category = "صور وتصميم",
        prompt = "A breathtaking cinematic 8K photo of futuristic Arabic city with Islamic geometric architecture, glowing water canals, flying vehicles, golden hour lighting",
        targetTab = "image"
    ),
    QuickTemplate(
        id = "t3",
        title = "سيناريو إعلان ترويجي رقمي",
        description = "قصة مصورة لإطلاق تطبيق تقني جديد في العالم العربي",
        category = "فيديو وسيناريو",
        prompt = "إعلان ترويجي حماسي لتطبيق هاتف يحل مشكلة التوصيل السريع مع تركيز على السرعة والموثوقية",
        targetTab = "video"
    ),
    QuickTemplate(
        id = "t4",
        title = "تدقيق رسالة أعمال رسمية",
        description = "إعادة صياغة بريد إلكتروني أو خطاب رسمي بأسلوب فصيح ومؤثر",
        category = "كتابة وبحوث",
        prompt = "أعد صياغة هذا الخطاب ليكون رسمياً وبليغاً وموجهاً إلى إدارة تنفيذية عليا:",
        targetTab = "audio"
    )
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickTemplatesSheet(
    onDismiss: () -> Unit,
    onSelectTemplate: (QuickTemplate) -> Unit
) {
    val categories = listOf("الكل", "كتابة وبحوث", "صور وتصميم", "فيديو وسيناريو")
    var selectedCategory by remember { mutableStateOf("الكل") }

    val filteredTemplates = remember(selectedCategory) {
        if (selectedCategory == "الكل") SAMPLE_TEMPLATES
        else SAMPLE_TEMPLATES.filter { it.category == selectedCategory }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceDark,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextSecondary) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(AccentBlue),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.GridView,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Text(
                        text = "القوالب والجاهزية السريعة",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "إغلاق", tint = TextSecondary)
                }
            }

            // Categories
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { cat ->
                    FilterChipCustom(
                        selected = selectedCategory == cat,
                        label = cat,
                        onClick = { selectedCategory = cat }
                    )
                }
            }

            // Template Cards List
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 380.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filteredTemplates) { template ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .clickable {
                                onSelectTemplate(template)
                                onDismiss()
                            }
                            .border(1.dp, BorderDark, RoundedCornerShape(14.dp)),
                        shape = RoundedCornerShape(14.dp),
                        color = CardBg
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = template.title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = TextPrimary
                                )
                                Surface(
                                    color = SurfaceDark,
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.border(1.dp, BorderDark, RoundedCornerShape(6.dp))
                                ) {
                                    Text(
                                        text = template.category,
                                        fontSize = 10.sp,
                                        color = AccentBlueLight,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Text(
                                text = template.description,
                                fontSize = 12.sp,
                                color = TextSecondary,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
