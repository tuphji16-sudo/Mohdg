import { ChatMessage, ChatMode, ImageStyle, AspectRatio, VideoStoryboard } from '../types';

export interface ChatStreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export const apiService = {
  // Stream Chat
  streamChat: async (
    messages: ChatMessage[],
    mode: ChatMode,
    useSearch: boolean,
    images: { data: string; mimeType: string }[] = [],
    callbacks: ChatStreamCallbacks
  ) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          mode,
          useSearch,
          images,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Error: ${response.statusText}`);
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
              // ignore parse errors on partial frames
            }
          }
        }
      }
      callbacks.onDone();
    } catch (err: any) {
      callbacks.onError(err.message || 'حدث خطأ في الاتصال بالخادم');
    }
  },

  // Generate Image
  generateImage: async (
    prompt: string,
    aspectRatio: AspectRatio = '1:1',
    style: ImageStyle = 'realistic',
    sourceImage?: string | null
  ) => {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        style,
        sourceImage,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل توليد الصورة');
    }
    return data;
  },

  // Video Storyboard Generator
  generateStoryboard: async (
    topic: string,
    duration: string = '30s',
    tone: string = 'cinematic',
    targetAudience: string = 'عام'
  ): Promise<{ success: boolean; storyboard: VideoStoryboard }> => {
    const response = await fetch('/api/video-storyboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        duration,
        tone,
        targetAudience,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل كتابة سيناريو الفيديو');
    }
    return data;
  },

  // Veo Video Generation
  generateVeoVideo: async (
    prompt: string,
    aspectRatio: '16:9' | '9:16' = '16:9',
    resolution: '720p' | '1080p' = '720p',
    image?: string | null
  ) => {
    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        resolution,
        image,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل طلب توليد الفيديو');
    }
    return data;
  },

  // Check Veo Status
  checkVideoStatus: async (operationName: string) => {
    const response = await fetch('/api/video-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل فحص حالة الفيديو');
    }
    return data;
  },

  // TTS
  generateTTS: async (text: string, voice: string = 'Kore') => {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل توليد الصوت');
    }
    return data;
  },

  // Enhance Prompt
  enhancePrompt: async (prompt: string, type: 'image' | 'video' | 'chat' | 'code' = 'image') => {
    const response = await fetch('/api/enhance-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'فشل ترقية البرومبت');
    }
    return data.data;
  },
};
