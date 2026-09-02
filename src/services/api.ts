import { GoogleGenAI } from '@google/genai';
import { ChatMessage, ChatMode, AspectRatio, ImageStyle, VideoStoryboard } from '../types';

export interface ChatStreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

// Global API Key & Server URL Storage Keys
const STORAGE_API_KEY = 'gemini_api_key';
const STORAGE_SERVER_URL = 'nebras_server_url';

export const getStoredApiKey = (): string => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_API_KEY);
      if (stored && stored.trim()) return stored.trim();
    }
  } catch {
    // ignore
  }

  const metaEnv = (import.meta as any).env;
  if (metaEnv?.VITE_GEMINI_API_KEY) {
    return metaEnv.VITE_GEMINI_API_KEY;
  }

  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  return '';
};

export const setStoredApiKey = (key: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_API_KEY, key);
    }
  } catch {
    // ignore
  }
};

export const getStoredServerUrl = (): string => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_SERVER_URL);
      if (stored && stored.trim()) return stored.trim().replace(/\/$/, '');
    }
  } catch {
    // ignore
  }
  return '';
};

export const setStoredServerUrl = (url: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_SERVER_URL, url);
    }
  } catch {
    // ignore
  }
};

/**
 * Resolves the backend server API base URL.
 */
export const getApiBaseUrl = (): string => {
  const custom = getStoredServerUrl();
  if (custom) return custom;

  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost') && !origin.includes('capacitor://') && origin.startsWith('http')) {
      return origin;
    }
  }

  const metaEnv = (import.meta as any).env;
  if (metaEnv?.VITE_API_URL) {
    return (metaEnv.VITE_API_URL as string).replace(/\/$/, '');
  }

  return '';
};

/**
 * Returns a configured GoogleGenAI instance for direct client-side execution.
 */
export const getClientGenAI = (customKey?: string): GoogleGenAI => {
  const key = customKey || getStoredApiKey();
  if (!key) {
    throw new Error(
      'لم يتم العثور على مفتاح Gemini API. يرجى الضغط على زر "الإعدادات" في الأعلى وإدخال مفتاحك المجاني من Google AI Studio.'
    );
  }
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Centralized Arabic Error Translator (Prevents raw JSON / technical codes from leaking to UI)
 */
export const formatApiError = (err: any): string => {
  if (!err) return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';

  // Keep full technical details in debug logs
  console.error('[API Error Debug Log]:', err);

  let rawString = typeof err === 'string' ? err : err.message || JSON.stringify(err);

  // Try to parse inner JSON string if embedded
  try {
    const jsonMatch = rawString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        rawString += ` ${parsed.error.message} ${parsed.error.status || ''} ${parsed.error.code || ''}`;
      }
    }
  } catch {
    // ignore parse error
  }

  const lower = rawString.toLowerCase();

  // 1. Rate Limit / Quota Exceeded (429)
  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('exceeded your current')
  ) {
    return 'تم تجاوز حد الاستخدام مؤقتًا (Rate Limit). انتظر قليلًا ثم حاول مرة أخرى.';
  }

  // 2. Model Not Found / Deprecated (404)
  if (
    lower.includes('404') ||
    lower.includes('not_found') ||
    lower.includes('no longer available') ||
    lower.includes('is not found')
  ) {
    return 'موديل الذكاء الاصطناعي غير متاح حاليًا. جاري استخدام موديل بديل.';
  }

  // 3. Unauthorized / Invalid Key (401, 403)
  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthenticated') ||
    lower.includes('permission_denied') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('invalid api key')
  ) {
    return 'مفتاح API أو صلاحيات المشروع غير صحيحة. يرجى مراجعة إعدادات المفتاح ⚙️.';
  }

  // 4. Bad Request (400)
  if (lower.includes('400') || lower.includes('invalid_argument') || lower.includes('bad request')) {
    return 'الطلب غير صالح. تحقق من البيانات المدخلة.';
  }

  // 5. Server Error (5xx)
  if (
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('unavailable') ||
    lower.includes('internal error')
  ) {
    return 'الخدمة غير متاحة مؤقتًا. حاول مرة أخرى.';
  }

  // 6. Network / Offline Error
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('load failed') ||
    lower.includes('connection refused') ||
    lower.includes('err_name_not_resolved') ||
    lower.includes('offline')
  ) {
    return 'تعذر الاتصال بالإنترنت.';
  }

  // If already clean Arabic sentence
  if (/[\u0600-\u06FF]/.test(rawString) && !rawString.includes('{') && !rawString.includes('code":')) {
    return rawString;
  }

  return 'الخدمة غير متاحة مؤقتًا. حاول مرة أخرى.';
};

/**
 * Test Gemini API connection
 */
export const testGeminiConnection = async (testKey?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const ai = getClientGenAI(testKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: 'مرحبا، تأكيد اتصال سريع.',
    });
    if (response.text) {
      return { success: true, message: 'تم الاتصال بنجاح بمزود Google Gemini API!' };
    }
    return { success: false, message: 'لم يتم استلام نص من النموذج.' };
  } catch (err: any) {
    return { success: false, message: formatApiError(err) };
  }
};

/**
 * Safely parse JSON from fetch response
 */
async function safeParseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`استجاب الخادم بنوع غير متوقع: ${text.slice(0, 150)}`);
  }

  return response.json();
}

// System Prompts for different Modes
const getSystemInstruction = (mode: ChatMode): string => {
  switch (mode) {
    case 'fast':
      return 'أنت "نبراس السريع"، مساعد ذكي سريع ومختصر ودقيق جداً باللغة العربية الفصحى. قدم إجابات مباشرة وموجزة.';
    case 'deep':
      return 'أنت "نبراس للبحث والتفكير المعمق"، مساعد ذكي تحليلي يقدم شروحات وافية، مفصلة، مدعمة بالأدلة والمنطق باللغة العربية.';
    case 'creative':
      return 'أنت "نبراس المبدع"، خبير في الكتابة الإبداعية، السرد القصصي، وتوليد الأفكار الابتكارية بأسلوب عربي فصيح وجذاب.';
    case 'code':
      return 'أنت "نبراس البرمجي"، مهندس برمجيات محترف باللغة العربية. قدم كوداً نظيفاً، موثقاً، مع شرح الأخطاء وحلولها بدقة.';
    default:
      return 'أنت "نبراس"، المنصة الشاملة للذكاء الاصطناعي التوليدي. أجب باللغة العربية بأسلوب احترافي وودود.';
  }
};

// Video in-flight lock to prevent concurrent Veo calls that trigger 429
let isVeoRequestInFlight = false;

export const apiService = {
  // Helper exposed for UI
  formatError: formatApiError,

  // 1. STREAM CHAT
  streamChat: async (
    messages: ChatMessage[],
    mode: ChatMode,
    useSearch: boolean,
    selectedImages: { data: string; mimeType: string }[] = [],
    callbacks: ChatStreamCallbacks
  ) => {
    const baseUrl = getApiBaseUrl();

    // If a backend server URL exists, try it first
    if (baseUrl) {
      try {
        const response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream, application/json',
          },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            mode,
            useSearch,
            images: selectedImages,
          }),
        });

        if (response.ok) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) throw new Error('لا يمكن قراءة دفق الرد');

          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const jsonStr = trimmed.replace(/^data: /, '').trim();
              if (jsonStr === '[DONE]') {
                callbacks.onDone();
                return;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.text) callbacks.onChunk(parsed.text);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.done) {
                  callbacks.onDone();
                  return;
                }
              } catch {
                // ignore chunk parse
              }
            }
          }
          callbacks.onDone();
          return;
        }
      } catch (backendErr) {
        console.warn('Backend chat stream failed, falling back to direct GenAI client:', backendErr);
      }
    }

    // Direct Client-Side Gemini Execution (Capacitor Native or Backend Fallback)
    try {
      const ai = getClientGenAI();
      const candidateModels = mode === 'deep' 
        ? ['gemini-3.1-pro-preview', 'gemini-3.7-flash', 'gemini-3.1-flash-lite']
        : ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
      const systemInstruction = getSystemInstruction(mode);

      // Build contents array
      const contents = messages.map((msg) => {
        const parts: any[] = [];
        if (msg.images && msg.images.length > 0) {
          msg.images.forEach((imgBase64) => {
            const match = imgBase64.match(/^data:(.*?);base64,(.*)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1] || 'image/jpeg',
                  data: match[2],
                },
              });
            }
          });
        }
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        return {
          role: msg.role === 'model' ? 'model' : 'user',
          parts,
        };
      });

      // Append current selected images to last user message if any
      if (selectedImages && selectedImages.length > 0 && contents.length > 0) {
        const last = contents[contents.length - 1];
        if (last.role === 'user') {
          selectedImages.forEach((img) => {
            const match = img.data.match(/^data:(.*?);base64,(.*)$/);
            const base64Data = match ? match[2] : img.data;
            last.parts.unshift({
              inlineData: {
                mimeType: img.mimeType || 'image/jpeg',
                data: base64Data,
              },
            });
          });
        }
      }

      const config: any = {
        systemInstruction,
      };

      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      let streamSuccess = false;
      let lastStreamError: any = null;

      for (const modelToTry of candidateModels) {
        try {
          const streamResult = await ai.models.generateContentStream({
            model: modelToTry,
            contents,
            config,
          });

          for await (const chunk of streamResult) {
            if (chunk.text) {
              callbacks.onChunk(chunk.text);
            }
          }
          streamSuccess = true;
          break;
        } catch (mErr: any) {
          console.warn(`Model ${modelToTry} failed during stream:`, mErr);
          lastStreamError = mErr;
        }
      }

      if (streamSuccess) {
        callbacks.onDone();
      } else {
        throw lastStreamError || new Error('تعذر إنشاء المحادثة');
      }
    } catch (directErr: any) {
      console.error('Direct Gemini stream error:', directErr);
      callbacks.onError(formatApiError(directErr));
    }
  },

  // 2. GENERATE IMAGE
  generateImage: async (
    prompt: string,
    aspectRatio: AspectRatio = '1:1',
    style: ImageStyle = 'realistic',
    sourceImage?: string | null
  ): Promise<{
    success: boolean;
    imageUrl?: string;
    prompt?: string;
    enhancedPrompt?: string;
    description?: string;
    message?: string;
  }> => {
    const baseUrl = getApiBaseUrl();

    // If backend URL is set, try backend first
    if (baseUrl) {
      try {
        const response = await fetch(`${baseUrl}/api/generate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ prompt, aspectRatio, style, sourceImage }),
        });
        const data = await safeParseResponse(response);
        if (response.ok && data.success && data.imageUrl) {
          return data;
        }
      } catch (backendErr) {
        console.warn('Backend image generation failed, falling back to direct GenAI client:', backendErr);
      }
    }

    // Direct Client-Side Image Generation
    try {
      const ai = getClientGenAI();
      const stylePrompts: Record<string, string> = {
        realistic: 'ultra realistic 8k photography, highly detailed, photorealistic lighting, masterpiece',
        islamic: 'fine Islamic art style, intricate arabesque geometric patterns, gold leaf illumination, majestic',
        digital_art: 'vibrant modern digital concept art, trending on ArtStation, cinematic atmosphere',
        anime: 'high quality anime illustration, studio ghibli aesthetic, clean line art, vibrant colors',
        oil_painting: 'classic fine oil painting on canvas, rich brush strokes, dramatic chiaroscuro',
        '3d_render': 'octane 3D render, raytracing, unreal engine 5, clean volumetric lighting',
        cinematic: 'cinematic still frame, 35mm lens, depth of field, blockbuster movie lighting',
        logo_design: 'minimalist modern vector logo design, clean emblem, flat design, iconographic',
      };

      const styleModifier = stylePrompts[style] || stylePrompts.realistic;
      const enhancedPrompt = `${prompt}, ${styleModifier}`;

      const parts: any[] = [];
      if (sourceImage) {
        const match = sourceImage.match(/^data:(.*?);base64,(.*)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1] || 'image/png',
              data: match[2],
            },
          });
        }
      }
      parts.push({ text: enhancedPrompt });

      const candidateModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];
      let imageUrl: string | null = null;
      let description = '';
      let lastModelError: any = null;

      for (const modelName of candidateModels) {
        try {
          const config: any = {
            imageConfig: {
              aspectRatio: aspectRatio as any,
            },
          };
          if (modelName === 'gemini-3.1-flash-image') {
            config.imageConfig.imageSize = '1K';
          }

          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config,
          });

          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              } else if (part.text) {
                description += part.text;
              }
            }
          }

          if (imageUrl) break;
        } catch (modelErr: any) {
          console.warn(`Model ${modelName} direct attempt failed:`, modelErr);
          lastModelError = modelErr;
        }
      }

      if (imageUrl) {
        return {
          success: true,
          imageUrl,
          prompt,
          enhancedPrompt,
          description: description || `تم إنشاء الصورة بنمط ${style} وبأبعاد ${aspectRatio}`,
        };
      }

      if (lastModelError) {
        throw new Error(formatApiError(lastModelError));
      }

      throw new Error('لم يتم استرجاع بيانات صورة صالحة من النموذج.');
    } catch (directErr: any) {
      console.error('Direct image generation error:', directErr);
      throw new Error(formatApiError(directErr));
    }
  },

  // 3. GENERATE VEO VIDEO (with Rate Limit / Concurrency guard)
  generateVeoVideo: async (
    prompt: string,
    aspectRatio: '16:9' | '9:16' = '16:9',
    resolution: '720p' | '1080p' = '720p',
    image?: string | null
  ) => {
    if (isVeoRequestInFlight) {
      throw new Error('يوجد طلب إنشاء فيديو قيد المعالجة حالياً. يرجى الانتظار حتى اكتماله لتفادي تجاوز حد الاستخدام.');
    }

    isVeoRequestInFlight = true;
    const baseUrl = getApiBaseUrl();

    try {
      if (baseUrl) {
        try {
          const response = await fetch(`${baseUrl}/api/generate-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ prompt, aspectRatio, resolution, image }),
          });
          const data = await safeParseResponse(response);
          if (response.ok && data.success) {
            isVeoRequestInFlight = false;
            return data;
          }
        } catch (backendErr) {
          console.warn('Backend Veo video request failed, falling back to direct GenAI client:', backendErr);
        }
      }

      // Direct Veo Video Generation Request
      const ai = getClientGenAI();
      const modelName = 'veo-3.1-lite-generate-preview';

      const config: any = {
        numberOfVideos: 1,
        aspectRatio,
        resolution: resolution === '1080p' ? '1080p' : '720p',
      };

      let imagePayload: any = undefined;
      if (image) {
        const match = image.match(/^data:(.*?);base64,(.*)$/);
        if (match) {
          imagePayload = {
            imageBytes: match[2],
            mimeType: match[1] || 'image/png',
          };
        }
      }

      const operation = await ai.models.generateVideos({
        model: modelName,
        prompt,
        image: imagePayload,
        config,
      });

      isVeoRequestInFlight = false;
      return {
        success: true,
        operationName: operation.name || (operation as any).name,
        message: 'تم بدء معالجة الفيديو بنجاح عبر نموذج Google Veo 3.1',
      };
    } catch (directErr: any) {
      isVeoRequestInFlight = false;
      console.error('Direct Veo video generation error:', directErr);
      throw new Error(formatApiError(directErr));
    }
  },

  // 4. CHECK VEO VIDEO STATUS (POLLING with Safe Extraction)
  checkVideoStatus: async (operationName: string) => {
    const baseUrl = getApiBaseUrl();

    if (baseUrl) {
      try {
        const response = await fetch(`${baseUrl}/api/video-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ operationName }),
        });
        const data = await safeParseResponse(response);
        if (response.ok) {
          if (data.downloadUrl?.startsWith('/api/')) data.downloadUrl = `${baseUrl}${data.downloadUrl}`;
          if (data.videoUrl?.startsWith('/api/')) data.videoUrl = `${baseUrl}${data.videoUrl}`;
          return data;
        }
      } catch (backendErr) {
        console.warn('Backend video status check failed, falling back to direct GenAI client:', backendErr);
      }
    }

    // Direct Client-Side Veo Operation Check
    try {
      const ai = getClientGenAI();
      const opResult = await ai.operations.getVideosOperation({
        operation: { name: operationName } as any,
      });

      const isDone = opResult.done || false;
      const error = opResult.error;

      if (error) {
        return {
          done: true,
          error: { message: formatApiError(error) },
        };
      }

      if (isDone) {
        const generatedVideos = (opResult.response as any)?.generatedVideos;
        const videoObj = generatedVideos?.[0]?.video;
        let finalVideoUrl: string | null = null;

        if (videoObj?.videoBytes) {
          finalVideoUrl = `data:video/mp4;base64,${videoObj.videoBytes}`;
        } else if (videoObj?.uri) {
          const apiKey = getStoredApiKey();
          finalVideoUrl = videoObj.uri.includes('?') 
            ? `${videoObj.uri}&key=${apiKey}` 
            : `${videoObj.uri}?key=${apiKey}`;
        }

        return {
          done: true,
          videoUrl: finalVideoUrl,
          downloadUrl: finalVideoUrl,
          filename: `Veo_Video_${Date.now()}.mp4`,
        };
      }

      return {
        done: false,
        progress: 50,
        statusMessage: 'جاري معالجة الإطارات السينمائية بواسطة Veo 3.1...',
      };
    } catch (directErr: any) {
      console.error('Direct check video status error:', directErr);
      throw new Error(formatApiError(directErr));
    }
  },

  // 5. ENHANCE PROMPT
  enhancePrompt: async (prompt: string, type: 'image' | 'video' | 'chat' | 'code' = 'image') => {
    const baseUrl = getApiBaseUrl();

    if (baseUrl) {
      try {
        const response = await fetch(`${baseUrl}/api/enhance-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ prompt, type }),
        });
        const data = await safeParseResponse(response);
        if (response.ok && data.success) return data;
      } catch (backendErr) {
        console.warn('Backend prompt enhancer failed, falling back to direct GenAI client:', backendErr);
      }
    }

    // Direct Client-Side Prompt Enhancement
    try {
      const ai = getClientGenAI();
      const systemInstruction = `أنت مهندس صياغة برومبتات احترافي (Prompt Engineer) باللغة العربية والإنجليزية.
مهمتك ترقية الوصف المقدم من المستخدم وجعله وصفاً سينمائياً فائق الجودة متوافق مع نماذج الذكاء الاصطناعي (${type}).
أرجع النتيجة بصيغة JSON فقط:
{
  "enhancedArabic": "الوصف العربي المطور مع إضاءة وتفاصيل",
  "enhancedEnglish": "Detailed English prompt with cinematic lighting, quality keywords",
  "negativePrompt": "blurry, low quality, distorted"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      return {
        success: true,
        enhancedArabic: parsed.enhancedArabic || prompt,
        enhancedEnglish: parsed.enhancedEnglish || prompt,
        negativePrompt: parsed.negativePrompt || '',
      };
    } catch (directErr: any) {
      console.error('Direct enhance prompt error:', directErr);
      return {
        success: true,
        enhancedArabic: `${prompt}، تفاصيل بصرية دقيقة وإضاءة سينمائية احترافية بجودة 8K`,
        enhancedEnglish: `${prompt}, highly detailed, 8k resolution, cinematic lighting`,
      };
    }
  },

  // 6. VIDEO STORYBOARD
  generateStoryboard: async (
    topic: string,
    duration: string = '30s',
    targetAudience: string = 'عام'
  ): Promise<{ success: boolean; storyboard: VideoStoryboard }> => {
    const baseUrl = getApiBaseUrl();

    if (baseUrl) {
      try {
        const response = await fetch(`${baseUrl}/api/video-storyboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ topic, duration, targetAudience }),
        });
        const data = await safeParseResponse(response);
        if (response.ok && data.success && data.storyboard) return data;
      } catch (backendErr) {
        console.warn('Backend storyboard failed, falling back to direct GenAI client:', backendErr);
      }
    }

    // Direct Client-Side Storyboard Generator
    try {
      const ai = getClientGenAI();
      const systemInstruction = `أنت مخرج سينمائي وكاتب سيناريو محترف. قم بإنشاء قصة مصورة (Storyboard) متكاملة للموضوع المطلوب باللغة العربية.
أرجع النتيجة بتنسيق JSON حصراً:
{
  "title": "عنوان الفيديو",
  "synopsis": "ملخص الفكرة والأجواء العامة",
  "scenes": [
    {
      "sceneNumber": 1,
      "time": "0:00 - 0:05",
      "visualDescription": "وصف المشهد البصري بدقة",
      "voiceover": "التعليق الصوتي أو النص الحواري",
      "cameraAngle": "زاوية الكاميرا (مثال: لقطة واسعة سينمائية)",
      "promptSuggestion": "برومبت إنجليزي لتوليد هذا المشهد بواسطة Veo 3.1"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `الموضوع: ${topic} | المدة: ${duration} | الجمهور: ${targetAudience}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      return {
        success: true,
        storyboard: parsed,
      };
    } catch (directErr: any) {
      console.error('Direct storyboard generation error:', directErr);
      throw new Error(formatApiError(directErr));
    }
  },

  // 7. TTS
  generateTTS: async (text: string, voice: string = 'Kore') => {
    const baseUrl = getApiBaseUrl();

    if (baseUrl) {
      try {
        const response = await fetch(`${baseUrl}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ text, voice }),
        });
        const data = await safeParseResponse(response);
        if (response.ok && data.audioData) return data;
      } catch (backendErr) {
        console.warn('Backend TTS failed:', backendErr);
      }
    }

    // Browser Speech Synthesis fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      window.speechSynthesis.speak(utterance);
      return { success: true, method: 'browser_speech' };
    }

    throw new Error('خدمة تحويل النص إلى صوت غير مدعومة في هذا الجهاز.');
  },
};

