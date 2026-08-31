import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Paperclip,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Globe,
  Brain,
  Zap,
  Code,
  PenTool,
  X,
  Bot,
  User,
  Share2,
} from 'lucide-react';
import { ChatMessage, ChatMode, Conversation } from '../types';
import { apiService } from '../services/api';
import { SpeechHelper } from '../services/speech';
import { storageService } from '../services/storage';

interface ChatStudioProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const ChatStudio: React.FC<ChatStudioProps> = ({
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      content: `مرحباً بك في **نبراس للذكاء الاصطناعي الشامل**! 🌟
أنا هنا لمساعدتك في كل ما تحتاجه باللغة العربية الفصحى بدقة وبلاغة:
- ✍️ **كتابة المحتوى والسيناريو والتقارير**
- 🧠 **تحليل البيانات والاستشارات المنطقية والأكاديمية**
- 💻 **كتابة الأكواد وتصميم المعماريات البرمجية**
- 🎨 **صياغة الأوصاف البصرية للصور والفيديو**
- 🔍 **البحث بالإنترنت للحصول على أحدث المعلومات**

كيف يمكنني مساعدتك اليوم؟`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('balanced');
  const [useSearch, setUseSearch] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ data: string; mimeType: string }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle initial prompt from templates if provided
  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  // Handle Voice Input (Speech-to-Text)
  const toggleSpeechRecognition = () => {
    if (isListening) {
      SpeechHelper.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      SpeechHelper.startListening(
        {
          onResult: (transcript) => {
            setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          },
          onError: (err) => {
            console.error('Speech error:', err);
            setIsListening(false);
          },
          onEnd: () => {
            setIsListening(false);
          },
        },
        'ar-SA'
      );
    }
  };

  // Handle Image File Selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSelectedImages((prev) => [
          ...prev,
          { data: base64, mimeType: file.type || 'image/jpeg' },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Send Message
  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if ((!textToSend && selectedImages.length === 0) || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const modelMessageId = `model-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: textToSend,
      timestamp,
      images: selectedImages.map((img) => img.data),
    };

    const newModelMessage: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      content: '',
      timestamp,
      isStreaming: true,
      useSearch,
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages([...updatedMessages, newModelMessage]);
    setInput('');
    const currentImages = [...selectedImages];
    setSelectedImages([]);
    setIsLoading(true);

    let accumulatedResponse = '';

    await apiService.streamChat(
      [...updatedMessages],
      mode,
      useSearch,
      currentImages,
      {
        onChunk: (chunk) => {
          accumulatedResponse += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId ? { ...msg, content: accumulatedResponse } : msg
            )
          );
        },
        onDone: () => {
          setIsLoading(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg
            )
          );

          // Save conversation to local storage
          const conversation: Conversation = {
            id: `conv-${Date.now()}`,
            title: textToSend ? textToSend.slice(0, 35) + '...' : 'محادثة ذكية',
            messages: [
              ...updatedMessages,
              { ...newModelMessage, content: accumulatedResponse, isStreaming: false },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            mode,
          };
          storageService.saveConversation(conversation);
        },
        onError: (errorMsg) => {
          setIsLoading(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? {
                    ...msg,
                    content: `⚠️ عذراً، حدث خطأ: ${errorMsg}\nيرجى التأكد من اتصالك بالإنترنت أو مراجعة إعدادات المفتاح.`,
                    isStreaming: false,
                  }
                : msg
            )
          );
        },
      }
    );
  };

  // Text to Speech playback
  const handleToggleSpeak = async (msg: ChatMessage) => {
    if (speakingMessageId === msg.id) {
      SpeechHelper.stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    SpeechHelper.stopSpeaking();
    setSpeakingMessageId(msg.id);

    // Try browser speech synthesis first for instant playback
    const spoken = SpeechHelper.speakArabic(
      msg.content,
      () => setSpeakingMessageId(msg.id),
      () => setSpeakingMessageId(null)
    );

    if (!spoken) {
      // Fallback to Server TTS
      try {
        const res = await apiService.generateTTS(msg.content.slice(0, 400), 'Kore');
        if (res.audioBase64) {
          SpeechHelper.playBase64Audio(res.audioBase64, res.mimeType, () =>
            setSpeakingMessageId(null)
          );
        }
      } catch (err) {
        console.error('Server TTS failed:', err);
        setSpeakingMessageId(null);
      }
    }
  };

  // Copy message
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear chat
  const handleClearChat = () => {
    SpeechHelper.stopSpeaking();
    setMessages([
      {
        id: 'new-chat-msg',
        role: 'model',
        content: 'تم بدء محادثة جديدة! كيف يمكنني مساعدتك الآن؟ ✨',
        timestamp: new Date().toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  };

  return (
    <div id="chat-studio-container" className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto w-full px-2 sm:px-4 py-2">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-[#11141B] p-2.5 border border-[#1F2937] mb-3 shadow-lg">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setMode('balanced')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'balanced'
                ? 'bg-[#1F2937] text-blue-400 font-semibold ring-1 ring-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]/50'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${mode === 'balanced' ? 'bg-blue-500' : 'bg-slate-600'}`} />
            <Zap className="h-3.5 w-3.5" />
            <span>متوازن وسريع</span>
          </button>

          <button
            onClick={() => setMode('deep')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'deep'
                ? 'bg-[#1F2937] text-blue-400 font-semibold ring-1 ring-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]/50'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${mode === 'deep' ? 'bg-blue-500' : 'bg-slate-600'}`} />
            <Brain className="h-3.5 w-3.5" />
            <span>تفكير عميق (Reasoning)</span>
          </button>

          <button
            onClick={() => setMode('creative')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'creative'
                ? 'bg-[#1F2937] text-blue-400 font-semibold ring-1 ring-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]/50'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${mode === 'creative' ? 'bg-blue-500' : 'bg-slate-600'}`} />
            <PenTool className="h-3.5 w-3.5" />
            <span>إبداعي وبلاغي</span>
          </button>

          <button
            onClick={() => setMode('code')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'code'
                ? 'bg-[#1F2937] text-blue-400 font-semibold ring-1 ring-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]/50'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${mode === 'code' ? 'bg-blue-500' : 'bg-slate-600'}`} />
            <Code className="h-3.5 w-3.5" />
            <span>برمجة وتقنية</span>
          </button>
        </div>

        {/* Search Grounding Toggle & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseSearch(!useSearch)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
              useSearch
                ? 'bg-blue-950/50 text-blue-400 border border-blue-500/40'
                : 'text-slate-400 hover:bg-[#1F2937] hover:text-slate-200 border border-[#1F2937]'
            }`}
            title="تفعيل البحث بالويب لأحدث المعلومات"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>البحث بالويب {useSearch ? 'مفعل' : 'معطل'}</span>
          </button>

          <button
            onClick={handleClearChat}
            className="flex items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
            title="مسح المحادثة"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-5 px-1 py-2 pr-2">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse max-w-4xl mr-auto' : 'flex-row max-w-4xl'}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isUser
                    ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border border-[#1F2937]'
                }`}
              >
                {isUser ? 'U' : 'AI'}
              </div>

              {/* Message Bubble */}
              <div
                className={`group relative max-w-[88%] sm:max-w-[82%] p-5 transition-all ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tl-none shadow-xl shadow-blue-900/10'
                    : 'bg-[#11141B] border border-[#1F2937] text-slate-200 rounded-2xl rounded-tr-none shadow-lg'
                }`}
              >
                {/* Image attachments if any */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {msg.images.map((imgSrc, idx) => (
                      <img
                        key={idx}
                        src={imgSrc}
                        alt="attachment"
                        className="max-h-48 max-w-full rounded-xl border border-slate-700 object-cover shadow-sm"
                      />
                    ))}
                  </div>
                )}

                {/* Markdown text */}
                <div className="text-sm sm:text-base leading-relaxed break-words markdown-content space-y-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {/* Footer details & Action Buttons */}
                <div
                  className={`mt-3.5 flex items-center justify-between gap-3 text-xs border-t pt-2.5 ${
                    isUser
                      ? 'text-blue-100/75 border-white/10'
                      : 'text-slate-400 border-[#1F2937]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                    {msg.useSearch && (
                      <span className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800/40">
                        <Globe className="h-3 w-3" /> متصل بالويب
                      </span>
                    )}
                  </div>

                  {!isUser && msg.content && (
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      {/* Read Aloud TTS */}
                      <button
                        onClick={() => handleToggleSpeak(msg)}
                        className={`rounded-lg p-1.5 transition-all ${
                          speakingMessageId === msg.id
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-[#1F2937] text-slate-300 hover:text-white'
                        }`}
                        title="استماع صوتي"
                      >
                        {speakingMessageId === msg.id ? (
                          <VolumeX className="h-3.5 w-3.5 animate-pulse text-white" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="rounded-lg p-1.5 hover:bg-[#1F2937] text-slate-300 hover:text-white transition-all"
                        title="نسخ النص"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 sm:gap-4 items-center max-w-4xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-[#1F2937] text-blue-400 text-xs font-bold animate-pulse">
              AI
            </div>
            <div className="rounded-2xl rounded-tr-none bg-[#11141B] border border-[#1F2937] p-4 text-sm text-slate-300 flex items-center gap-2.5 shadow-lg">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              <span>جاري التحليل وصياغة الرد الفصيح...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Uploaded Images Preview Strip */}
      {selectedImages.length > 0 && (
        <div className="flex gap-2 p-2 bg-[#11141B] border border-[#1F2937] rounded-xl mb-2 overflow-x-auto">
          {selectedImages.map((img, idx) => (
            <div key={idx} className="relative group shrink-0">
              <img
                src={img.data}
                alt="Selected"
                className="h-16 w-16 object-cover rounded-lg border border-[#1F2937]"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form Area */}
      <div className="relative rounded-2xl bg-[#11141B] border border-[#1F2937] p-2.5 shadow-2xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
        <textarea
          id="chat-user-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="أدخل تعليماتك هنا للتعديل أو إنشاء محتوى جديد... (Enter للإرسال)"
          rows={2}
          className="w-full resize-none bg-transparent px-3 py-1.5 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />

        <div className="flex items-center justify-between border-t border-[#1F2937] pt-2 px-1">
          {/* Left tools (Voice, File attachment) */}
          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-slate-400 hover:bg-[#1F2937] hover:text-slate-200 transition-all text-xs font-medium border border-transparent hover:border-[#1F2937]"
              title="إرفاق صورة للتحليل البصري"
            >
              <Paperclip className="h-4 w-4 text-blue-400" />
              <span className="hidden sm:inline">إرفاق صورة</span>
            </button>

            {/* Voice Dictation (Microphone) */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-all text-xs font-medium border ${
                isListening
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'text-slate-400 hover:bg-[#1F2937] hover:text-slate-200 border-transparent hover:border-[#1F2937]'
              }`}
              title="التحدث صوتياً باللغة العربية"
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4 text-red-400" />
                  <span className="hidden sm:inline">جاري الاستماع...</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-blue-400" />
                  <span className="hidden sm:inline">تسجيل صوتي</span>
                </>
              )}
            </button>
          </div>

          {/* Send Button */}
          <button
            id="send-chat-btn"
            onClick={() => handleSend()}
            disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span>إرسال</span>
            <Send className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
