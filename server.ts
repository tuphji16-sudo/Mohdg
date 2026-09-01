import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// High payload limit for image data and audio attachments
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper for Arabic System Prompt
const ARABIC_ASSISTANT_SYSTEM_PROMPT = `أنت "نبراس" (Nebras AI) - مساعد ذكاء اصطناعي فائق الذكاء، بليغ، ودقيق، تم تصميمه لتقديم تجربة عربية استثنائية وعالمية.
تتميز بالآتي:
1. إتقان اللغة العربية الفصحى المعاصرة بأسلوب مشرق، واضح، بليغ وخالٍ من الركاكة والأخطاء الإملائية والنحوية.
2. القدرة على الإجابة عن كافة المجالات: العلوم، التكنولوجيا، البرمجة، الكتابة الإبداعية، السيناريو وصناعة المحتوى، الأعمال والتسويق، والتحليل المنطقي.
3. التنسيق المنظم والجميل باستخدام Markdown (عناوين واضحة، قوائم نقطية، جداول عند الحاجة، كتل برمجية منسقة مع تحديد لغة البرمجة).
4. عند طلب المستخدم صوراً أو مشاهد فيديو، قدم تفاصيل دقيقة، أوصافاً بصرية ملهمة (Visual prompts) باللغتين العربية والإنجليزية.
5. التكيف مع طلبات المستخدم (موجز، مفصل، أدبي، علمي، لهجات عربية عند الطلب المباشر).`;

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// 2. Chat & Text Generation endpoint (supports streaming & multimodal)
app.post("/api/chat", async (req, res) => {
  try {
    const {
      messages = [],
      systemInstruction,
      mode = "balanced", // 'fast', 'balanced', 'deep', 'code', 'creative'
      useSearch = false,
      images = [], // optional array of base64 images { data: string, mimeType: string }
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "مفتاح Gemini API غير مهيأ. يرجى التأكد من إضافة GEMINI_API_KEY في لوحة الإعدادات.",
      });
    }

    const candidateModels = mode === "deep" 
      ? ["gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"]
      : ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];

    // Format contents with role sanitization
    const validMessages = messages.filter((m: any) => m && m.content && m.content.trim().length > 0);
    // Skip any leading model greetings so first message is from user
    while (validMessages.length > 0 && validMessages[0].role !== "user") {
      validMessages.shift();
    }

    const contents: any[] = [];
    for (let i = 0; i < validMessages.length; i++) {
      const msg = validMessages[i];
      const role = msg.role === "user" ? "user" : "model";
      const parts: any[] = [{ text: msg.content || "" }];

      // If this is the last user message and has images attached
      if (i === validMessages.length - 1 && images && images.length > 0) {
        for (const img of images) {
          if (img.data) {
            const cleanBase64 = img.data.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
            parts.unshift({
              inlineData: {
                data: cleanBase64,
                mimeType: img.mimeType || "image/jpeg",
              },
            });
          }
        }
      }

      // Merge consecutive identical roles
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts.push(...parts);
      } else {
        contents.push({ role, parts });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "مرحباً" }] });
    }

    // Config setup
    const config: any = {
      systemInstruction: systemInstruction || ARABIC_ASSISTANT_SYSTEM_PROMPT,
      temperature: mode === "creative" ? 0.9 : mode === "code" ? 0.2 : 0.7,
    };

    if (mode === "deep") {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // SSE Stream
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let streamSuccess = false;
    let lastStreamError: any = null;

    for (const modelToTry of candidateModels) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model: modelToTry,
          contents,
          config,
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        streamSuccess = true;
        break;
      } catch (err: any) {
        console.warn(`Model ${modelToTry} stream failed:`, err?.message || err);
        lastStreamError = err;
        // Continue to fallback model
      }
    }

    if (!streamSuccess) {
      throw lastStreamError || new Error("تعذر الحصول على رد من نماذج الذكاء الاصطناعي المتاحة.");
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Chat generation error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || "حدث خطأ أثناء معالجة المحادثة",
      });
    } else {
      res.write(
        `data: ${JSON.stringify({ error: error.message || "حدث خطأ أثناء البث" })}\n\n`
      );
      res.end();
    }
  }
});

// 3. Image Generation & Editing endpoint
app.post("/api/generate-image", async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = "1:1",
      style = "realistic",
      sourceImage = null, // for image editing
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "يرجى كتابة وصف الصورة (Prompt)" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "مفتاح Gemini API غير مهيأ في السيرفر.",
      });
    }

    // Enhance prompt with stylistic modifiers
    let enhancedPrompt = prompt;
    const styleModifiers: Record<string, string> = {
      realistic: "ultra-realistic, 8k resolution, cinematic lighting, photorealistic, sharp focus, masterwork",
      islamic_art: "magnificent islamic arabesque geometry, calligraphy accents, ornate arabesque motifs, rich gold and lapis lazuli jewel tones",
      digital_art: "detailed digital art, artstation trending, dramatic lighting, vivid colors, highly detailed illustration",
      anime: "modern high-end anime aesthetic, makoto shinkai style, cinematic anime background, exquisite detail",
      three_d: "3D rendered style, octane render, unreal engine 5, ray-traced shadows, hyper-detailed",
      logo: "minimalist vector logo design, clean lines, iconic branding symbol, flat vector aesthetic, isolated",
    };

    if (styleModifiers[style]) {
      enhancedPrompt = `${prompt}, ${styleModifiers[style]}`;
    }

    const parts: any[] = [];

    // If editing source image
    if (sourceImage) {
      const cleanBase64 = sourceImage.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/png",
        },
      });
    }

    parts.push({ text: enhancedPrompt });

    const modelName = "gemini-3.1-flash-image";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: "1K",
        },
      },
    });

    let imageUrl: string | null = null;
    let description: string = "";

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        } else if (part.text) {
          description += part.text;
        }
      }
    }

    if (!imageUrl) {
      // Fallback: If image wasn't returned in inlineData, try flash-lite or text description
      return res.json({
        success: false,
        message: "لم يتم إنشاء الصورة بشكل مباشر، إليك الوصف البصري المقترح من النموذج",
        description: description || "تعذر توليد الصورة بالمعايير الحالية.",
      });
    }

    res.json({
      success: true,
      imageUrl,
      description,
      prompt: enhancedPrompt,
      aspectRatio,
      style,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({
      error: error.message || "حدث خطأ أثناء توليد الصورة",
    });
  }
});

// 4. Video Storyboard & Script Generator endpoint
app.post("/api/video-storyboard", async (req, res) => {
  try {
    const {
      topic,
      duration = "30s", // 15s, 30s, 60s, 90s
      tone = "cinematic", // cinematic, documentary, commercial, dramatic, educational
      targetAudience = "عام",
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "يرجى تحديد موضوع أو فكرة الفيديو" });
    }

    const systemPrompt = `أنت مخرج سينمائي وكاتب سيناريو ومطور محتوى فيديو خبير بالذكاء الاصطناعي.
مهمتك تحويل الفكرة المدخلة إلى سيناريو فيديو متكامل وقصة مصورة (Storyboard) احترافية باللغة العربية.
يجب أن ترجع النتيجة بصيغة JSON حصراً، تحتوي على:
1. title: عنوان مشوق للفيديو بالعربية.
2. logline: ملخص مكثف لفكرة الفيديو في جملة واحدة.
3. mood: الطابع العام والألوان والموسيقى المقترحة.
4. totalDuration: المدة التقريبية.
5. scenes: مصفوفة من المشاهد (من 3 إلى 6 مشاهد حسب المدة)، وكل مشهد يحتوي على:
   - sceneNumber: رقم المشهد (1, 2, ...).
   - timestamp: التوقيت (مثلاً 00:00 - 00:06).
   - visualDescription: وصف بصري دقيق للمشهد باللغة العربية (الإضاءة، حركة الكاميرا، العناصر الظاهرة).
   - cameraAngle: زاوية وحركة الكاميرا (مثلاً: لقطة واسعة سينمائية، تتبع بطيء، درون جوي، لقطة قريبة مقربة).
   - voiceoverArabic: النص الصوتي المقروء بالعربية (التعليق الصوتي الفصيح).
   - soundEffects: المؤثرات الصوتية والموسيقى الخلفية.
   - veoPromptEnglish: برومبت احترافي باللغة الإنجليزية مخصص لتوليد المشهد في نماذج الفيديو (Veo/Sora).
   - keyframeColor: لون متناسق للتصميم (Hex code).`;

    const userPrompt = `موضوع الفيديو: ${topic}
المدة المستهدفة: ${duration}
الأسلوب والطابع: ${tone}
الجمهور المستهدف: ${targetAudience}

أنتج السيناريو الكامل والمشاهد بصيغة JSON بدقة واحترافية عالية.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text?.trim() || "{}";
    let parsedData = {};
    try {
      parsedData = JSON.parse(jsonText);
    } catch {
      // In case of markdown backticks wrapper
      const cleaned = jsonText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
      parsedData = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      storyboard: parsedData,
    });
  } catch (error: any) {
    console.error("Video storyboard error:", error);
    res.status(500).json({
      error: error.message || "حدث خطأ أثناء كتابة سيناريو الفيديو",
    });
  }
});

// 5. Veo Video Generation (3-step pattern)
app.post("/api/generate-video", async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = "16:9",
      resolution = "720p",
      image = null,
    } = req.body;

    if (!prompt && !image) {
      return res.status(400).json({ error: "يجب تقديم وصف أو صورة لبدء إنشاء الفيديو" });
    }

    const payload: any = {
      model: "veo-3.1-lite-generate-preview",
      config: {
        numberOfVideos: 1,
        resolution: resolution === "1080p" ? "1080p" : "720p",
        aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
      },
    };

    if (prompt) payload.prompt = prompt;

    if (image) {
      const cleanBase64 = image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      payload.image = {
        imageBytes: cleanBase64,
        mimeType: "image/png",
      };
    }

    const operation = await ai.models.generateVideos(payload);

    res.json({
      success: true,
      operationName: operation.name,
    });
  } catch (error: any) {
    console.error("Generate video error:", error);
    res.status(500).json({
      error: error.message || "حدث خطأ أثناء طلب توليد الفيديو",
    });
  }
});

// 6. Veo Video Status Polling
app.post("/api/video-status", async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: "operationName is required" });
    }

    // Reconstruct operation instance
    const op: any = { name: operationName };
    const updated = await ai.operations.getVideosOperation({ operation: op as any });

    res.json({
      done: updated.done,
      error: updated.error || null,
      response: updated.response || null,
    });
  } catch (error: any) {
    console.error("Video status polling error:", error);
    res.status(500).json({
      error: error.message || "حدث خطأ أثناء فحص حالة الفيديو",
    });
  }
});

// 7. Text-to-Speech (TTS) Endpoint
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "Kore" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "النص مطلوب لتحويله إلى صوت" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `اقرأ النص التالي باللغة العربية الفصحى بصوت نقي وطبيعي: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice as any }, // Kore, Puck, Charon, Fenrir, Zephyr
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || "audio/wav";

    if (!base64Audio) {
      return res.status(500).json({ error: "تعذر توليد الصوت من النموذج" });
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType,
    });
  } catch (error: any) {
    console.error("TTS error:", error);
    res.status(500).json({
      error: error.message || "حدث خطأ أثناء معالجة الصوت",
    });
  }
});

// 8. Prompt Enhancer & Creative Magic
app.post("/api/enhance-prompt", async (req, res) => {
  try {
    const { prompt, type = "image" } = req.body; // 'image', 'video', 'chat', 'code'
    if (!prompt) {
      return res.status(400).json({ error: "يرجى كتابة الفكرة لترقيتها" });
    }

    const systemPrompt = `أنت خبير هندسة الأوامر (Prompt Engineering) للذكاء الاصطناعي.
مهمتك أخذ الفكرة أو الوصف البسيط من المستخدم وترقيته إلى برومبت احترافي فائق الدقة والتفاصيل.
قم بإرجاع JSON يحتوي على:
1. enhancedArabic: الوصف المطوّر فائق البلاغة والدقة بالعربية.
2. enhancedEnglish: البرومبت الإنجليزي عالي الاحترافية الموجه لنماذج الذكاء الاصطناعي (مثل Midjourney, Imagen, Veo, GPT, Gemini).
3. recommendedSettings: نصائح تقنية مقترحة (الإضاءة، أبعاد الصورة، زاوية الكاميرا، الأسلوب).
4. tags: وسوم رئيسية بالعربية.`;

    const userPrompt = `نوع الطلب: ${type}
الوصف الأصلي: ${prompt}

قم بصياغة البرومبت المطوّر بدقة.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text?.trim() || "{}";
    let parsedData = {};
    try {
      parsedData = JSON.parse(jsonText);
    } catch {
      const cleaned = jsonText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
      parsedData = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Enhance prompt error:", error);
    res.status(500).json({
      error: error.message || "حدث خطأ أثناء ترقية البرومبت",
    });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`نبراس AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
