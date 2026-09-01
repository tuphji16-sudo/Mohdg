import { ChatMessage, ChatMode, ImageStyle, AspectRatio, VideoStoryboard } from '../types';

export interface ChatStreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

/**
 * Resolves the backend server API base URL.
 * Automatically points to the live backend for Android Native Capacitor apps,
 * and uses origin / relative paths in normal Web browsers.
 */
export const getApiBaseUrl = (): string => {
  // Check custom configured URL if any
  try {
    const customUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('nebras_server_url') : null;
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/$/, '');
    }
  } catch {
    // ignore storage errors
  }

  // If in browser on normal web hosting
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost') && !origin.includes('capacitor://') && origin.startsWith('http')) {
      return origin;
    }
  }

  // Environment variable
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv.VITE_API_URL) {
    return (metaEnv.VITE_API_URL as string).replace(/\/$/, '');
  }

  // Production Cloud Run Applet URL for Android Native build
  return 'https://ais-pre-c7jbx2vrx2dedrkmtbmq3k-429081060331.europe-west2.run.app';
};

/**
 * Safely parse JSON from fetch response, handling unexpected HTML error pages gracefully
 */
async function safeParseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!contentType.includes('application/json') && text.trim().startsWith('<')) {
    if (!response.ok) {
      throw new Error(`خطأ في الخادم (رمز الحالة ${response.status}). يرجى التحقق من اتصال الإنترنت.`);
    }
    throw new Error('استجاب الخادم بصفحة غير متوقعة. يرجى إعادة المحاولة.');
  }

  try {
    return JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(`خطأ في الاستجابة (${response.status}): ${text.slice(0, 120)}`);
    }
    throw new Error('تعذر معالجة استجابة الخادم.');
  }
}

export const apiService = {
  // 1. Stream Chat
  streamChat: async (
    messages: ChatMessage[],
    mode: ChatMode,
    useSearch: boolean,
    images: { data: string; mimeType: string }[] = [],
    callbacks: ChatStreamCallbacks
  ) => {
    try {
      const baseUrl = getApiBaseUrl();
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
          images,
        }),
      });

      if (!response.ok) {
        const errorData = await safeParseResponse(response).catch((e) => ({ error: e.message }));
        throw new Error(errorData.error || `خطأ في الاتصال (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('تعذر قراءة مسار البث من الخادم');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.replace(/^data: /, '');
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                callbacks.onError(data.error);
                return;
              }
              if (data.text) {
                callbacks.onChunk(data.text);
              }
              if (data.done) {
                callbacks.onDone();
                return;
              }
            } catch {
              // ignore partial parse errors
            }
          }
        }
      }
      callbacks.onDone();
    } catch (err: any) {
      callbacks.onError(err.message || 'حدث خطأ في الاتصال بالخادم');
    }
  },

  // 2. Generate Image
  generateImage: async (
    prompt: string,
    aspectRatio: AspectRatio = '1:1',
    style: ImageStyle = 'realistic',
    sourceImage?: string | null
  ) => {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        style,
        sourceImage,
      }),
    });

    const data = await safeParseResponse(response);
    if (!response.ok) {
      throw new Error(data.error || 'فشل توليد الصورة');
    }
    return data;
  },

  // 3. Video Storyboard Generator
  generateStoryboard: async (
    topic: string,
    duration: string = '30s',
    tone: string = 'cinematic',
    targetAudience: string = 'عام'
  ): Promise<{ success: boolean; storyboard: VideoStoryboard }> => {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/video-storyboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        topic,
        duration,
        tone,
        targetAudience,
      }),
    });

    const data = await safeParseResponse(response);
    if (!response.ok) {
      throw new Error(data.error || 'فشل كتابة سيناريو الفيديو');
    }
    return data;
  },

  // 4. Veo Video Generation (Start Job)
  generateVeoVideo: async (
    prompt: string,
    aspectRatio: '16:9' | '9:16' = '16:9',
    resolution: '720p' | '1080p' = '720p',
    image?: string | null
  ) => {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        resolution,
        image,
      }),
    });

    const data = await safeParseResponse(response);
    if (!response.ok) {
      throw new Error(data.error || 'فشل طلب توليد الفيديو');
    }
    return data;
  },

  // 5. Check Veo Status (Poll Job)
  checkVideoStatus: async (operationName: string) => {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/video-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ operationName }),
    });

    const data = await safeParseResponse(response);
    if (!response.ok) {
      throw new Error(data.error || 'فشل فحص حالة الفيديو');
    }

    // Ensure download and proxy URLs include base URL if relative
    if (data.downloadUrl && data.downloadUrl.startsWith('/api/')) {
      data.downloadUrl = `${baseUrl}${data.downloadUrl}`;
    }
    if (data.videoUrl && data.videoUrl.startsWith('/api/')) {
      data.videoUrl = `${baseUrl}${data.videoUrl}`;
    }

    return data;
  },

  // 6. Text-to-Speech
  generateTTS: async (text: string, voice: string = 'Kore') => {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ text, voice }),
    });

    const data = await safeParseResponse(response);
    if (!response.ok) {
      throw new Error(data.error || 'فشل توليد الصوت');
    }
    return data;
  },

  // 7. Enhance Prompt
  enhancePrompt: async (prompt: string, type: 'image' | 'video' | 'chat' | 'code' = 'image') => {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/enhance-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ prompt, type }),
    });

    const data = await safeParseResponse(response);
    if (!response.ok) {
      throw new Error(data.error || 'فشل ترقية البرومبت');
    }
    return data.data;
  },
};

