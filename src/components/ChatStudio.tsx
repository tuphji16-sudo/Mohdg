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
  Share2,
  Download,
  Video,
  Image as ImageIcon,
  MessageSquare,
  Wand2,
  Monitor,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Film,
} from 'lucide-react';
import {
  ChatMessage,
  ChatMode,
  Conversation,
  AspectRatio,
  ImageStyle,
  GeneratedImage,
  GeneratedVideo,
} from '../types';
import { apiService } from '../services/api';
import { SpeechHelper } from '../services/speech';
import { storageService } from '../services/storage';
import { downloadVideoFile, shareVideo } from '../utils/videoUtils';
import { downloadImageFile, shareImage } from '../utils/imageUtils';

type ActiveInputMode = 'chat' | 'image' | 'video';

interface ChatStudioProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const ChatStudio: React.FC<ChatStudioProps> = ({
  initialPrompt,
  onClearInitialPrompt,
}) => {
  // Active Input Mode (Chat, Image Gen, Video Gen)
  const [inputMode, setInputMode] = useState<ActiveInputMode>('chat');

  // Load existing conversation or initialize
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = storageService.getConversations();
    if (saved.length > 0 && saved[0].messages.length > 0) {
      return saved[0].messages;
    }
    return [
      {
        id: 'welcome-msg',
        role: 'model',
        content: `مرحباً بك في **منصة نبراس للذكاء الاصطناعي الشامل**! 🌟
يمكنك الآن من نفس شاشة المحادثة تنفيذ كل ما تحتاجه:
- 💬 **محادثة ذكية ونصوص**: كتابة مقالات، أكواد، سيناريو، وتحليل باللغة العربية الفصحى.
- 🖼️ **توليد صور فائقة الجودة**: تحويل الأفكار إلى صور واقعية، فن إسلامي، ورقمي بدقة 1K.
- 🎬 **توليد فيديوهات حقيقية (Google Veo 3.1)**: إنشاء مقاطع فيديو سينمائية مع إمكانية التنزيل المباشر.

اختر النمط المطلوب من شريط الأدوات بالأسفل وابدأ الإبداع! ✨`,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        mediaType: 'text',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Chat options
  const [chatMode, setChatMode] = useState<ChatMode>('balanced');
  const [useSearch, setUseSearch] = useState(false);

  // Image Gen options
  const [imageAspectRatio, setImageAspectRatio] = useState<AspectRatio>('1:1');
  const [imageStyle, setImageStyle] = useState<ImageStyle>('realistic');

  // Video Gen options
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');

  // Attachment / Reference Images
  const [selectedImages, setSelectedImages] = useState<{ data: string; mimeType: string }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Persist conversation whenever messages change (debounce slightly)
  useEffect(() => {
    if (messages.length > 0) {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 35) + '...' : 'محادثة متعددة الوسائط';
      const conversation: Conversation = {
        id: 'main-chat-session',
        title,
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mode: chatMode,
      };
      storageService.saveConversation(conversation);
    }
  }, [messages, chatMode]);

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

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

  // Magic Prompt Enhancer
  const handleEnhancePrompt = async () => {
    if (!input.trim() || isEnhancingPrompt) return;
    setIsEnhancingPrompt(true);
    try {
      const type = inputMode === 'image' ? 'image' : inputMode === 'video' ? 'video' : 'chat';
      const enhanced = await apiService.enhancePrompt(input.trim(), type);
      if (enhanced?.enhancedArabic) {
        setInput(enhanced.enhancedArabic);
        showToast('✨ تم تحسين الوصف وترقيته بنجاح');
      }
    } catch (err: any) {
      console.warn('Enhance prompt failed:', err);
      showToast('⚠️ تعذر تحسين الوصف حالياً');
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // 1. Handle Send Text / Chat
  const handleSendChat = async (textToSend: string) => {
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
      mediaType: 'text',
    };

    const newModelMessage: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      content: '',
      timestamp,
      isStreaming: true,
      useSearch,
      mediaType: 'text',
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
      chatMode,
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

  // 2. Handle Generate Image in Chat
  const handleSendImage = async (promptToSend: string) => {
    const userMessageId = `user-${Date.now()}`;
    const modelMessageId = `model-img-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const sourceImage = selectedImages.length > 0 ? selectedImages[0].data : undefined;

    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: `🖼️ **طلب إنشاء صورة:** ${promptToSend}`,
      timestamp,
      images: sourceImage ? [sourceImage] : undefined,
      mediaType: 'image',
    };

    const newModelMessage: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      content: 'جاري رسم وتوليد الصورة بالذكاء الاصطناعي...',
      timestamp,
      mediaType: 'image',
      media: {
        type: 'image',
        prompt: promptToSend,
        aspectRatio: imageAspectRatio,
        style: imageStyle,
        status: 'generating',
        sourceImage,
      },
    };

    setMessages((prev) => [...prev, newUserMessage, newModelMessage]);
    setInput('');
    setSelectedImages([]);
    setIsLoading(true);

    try {
      const result = await apiService.generateImage(
        promptToSend,
        imageAspectRatio,
        imageStyle,
        sourceImage
      );

      if (result.success && result.imageUrl) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === modelMessageId
              ? {
                  ...msg,
                  content: result.description || `✨ تم توليد الصورة بنجاح بالأبعاد ${imageAspectRatio}`,
                  media: {
                    type: 'image',
                    url: result.imageUrl,
                    prompt: promptToSend,
                    aspectRatio: imageAspectRatio,
                    style: imageStyle,
                    status: 'completed',
                  },
                }
              : msg
          )
        );

        // Save to global media storage
        const savedImage: GeneratedImage = {
          id: `img-${Date.now()}`,
          url: result.imageUrl,
          prompt: promptToSend,
          style: imageStyle,
          aspectRatio: imageAspectRatio,
          createdAt: new Date().toISOString(),
          description: result.description,
        };
        storageService.saveImage(savedImage);
        showToast('✓ تم توليد الصورة بنجاح وحفظها في المعرض');
      } else {
        throw new Error(result.message || 'لم يرجع النموذج صورة صالحة');
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? {
                ...msg,
                content: `⚠️ تعذر توليد الصورة: ${err.message || 'حدث خطأ أثناء الاتصال'}`,
                media: {
                  type: 'image',
                  prompt: promptToSend,
                  status: 'failed',
                  error: err.message,
                },
              }
            : msg
        )
      );
      showToast('⚠️ فشل توليد الصورة');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Generate Video in Chat (Veo 3.1)
  const handleSendVideo = async (promptToSend: string, sourceImgOverride?: string) => {
    const userMessageId = `user-${Date.now()}`;
    const modelMessageId = `model-vid-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const sourceImage = sourceImgOverride || (selectedImages.length > 0 ? selectedImages[0].data : undefined);

    const newUserMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: sourceImage
        ? `🎬 **تحويل صورة إلى فيديو عبر Veo 3.1:** ${promptToSend || 'تحريك المشهد بإضاءة سينمائية'}`
        : `🎬 **طلب إنشاء فيديو (Veo 3.1):** ${promptToSend}`,
      timestamp,
      images: sourceImage ? [sourceImage] : undefined,
      mediaType: 'video',
    };

    const newModelMessage: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      content: 'جاري تهيئة نموذج Google Veo 3.1 لبدء معالجة الفيديو...',
      timestamp,
      mediaType: 'video',
      media: {
        type: 'video',
        prompt: promptToSend,
        aspectRatio: videoAspectRatio,
        resolution: videoResolution,
        status: 'generating',
        statusMessage: 'جاري إرسال الطلب وحجز خوادم Veo 3.1...',
        sourceImage,
      },
    };

    setMessages((prev) => [...prev, newUserMessage, newModelMessage]);
    setInput('');
    setSelectedImages([]);
    setIsLoading(true);

    try {
      const initResult = await apiService.generateVeoVideo(
        promptToSend || 'Cinematic realistic movement, high definition masterwork',
        videoAspectRatio,
        videoResolution,
        sourceImage
      );

      if (!initResult.operationName) {
        throw new Error('لم يتم استلام رقم العملية من خادم Veo');
      }

      const operationName = initResult.operationName;

      // Update message with operation tracking
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? {
                ...msg,
                media: {
                  ...msg.media!,
                  operationName,
                  statusMessage: 'جاري رسم الإطارات السينمائية وحساب الإضاءة والظلال...',
                },
              }
            : msg
        )
      );

      // Poll status every 6 seconds
      let pollAttempts = 0;
      const maxAttempts = 60; // Up to 6 minutes

      const pollInterval = setInterval(async () => {
        pollAttempts++;
        try {
          // Dynamic status text for rich feedback
          let dynamicStatus = 'جاري رسم الإطارات السينمائية وحساب الإضاءة والظلال...';
          if (pollAttempts > 3) dynamicStatus = 'معالجة الحركة واستقرار الكاميرا في Veo 3.1...';
          if (pollAttempts > 7) dynamicStatus = 'تطبيق الرندر والعمق البصري وتحسين الجودة...';
          if (pollAttempts > 12) dynamicStatus = 'وضع اللمسات النهائية وتجميع ملف MP4...';

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId && msg.media?.status === 'generating'
                ? {
                    ...msg,
                    media: {
                      ...msg.media!,
                      statusMessage: dynamicStatus,
                    },
                  }
                : msg
            )
          );

          const statusRes = await apiService.checkVideoStatus(operationName);

          if (statusRes.done) {
            clearInterval(pollInterval);
            setIsLoading(false);

            if (statusRes.error) {
              throw new Error(statusRes.error.message || 'حدث خطأ في معالجة الفيديو من خادم Veo');
            }

            const finalVideoUrl = statusRes.videoUrl;
            if (!finalVideoUrl) {
              throw new Error('اكتملت العملية ولكن لم يتم العثور على رابط الفيديو');
            }

            const downloadUrl = statusRes.downloadUrl || finalVideoUrl;
            const filename = statusRes.filename || `Veo31_Video_${Date.now()}.mp4`;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === modelMessageId
                  ? {
                      ...msg,
                      content: `🎬 **تم توليد الفيديو بنجاح عبر Veo 3.1!** (${videoAspectRatio} - ${videoResolution})`,
                      media: {
                        type: 'video',
                        url: finalVideoUrl,
                        downloadUrl,
                        filename,
                        prompt: promptToSend,
                        aspectRatio: videoAspectRatio,
                        resolution: videoResolution,
                        status: 'completed',
                      },
                    }
                  : msg
              )
            );

            // Save to global videos storage
            const savedVideo: GeneratedVideo = {
              id: `vid-${Date.now()}`,
              url: finalVideoUrl,
              prompt: promptToSend,
              aspectRatio: videoAspectRatio,
              resolution: videoResolution,
              createdAt: new Date().toISOString(),
              operationName,
            };
            storageService.saveVideo(savedVideo);
            showToast('✓ تم توليد الفيديو بنجاح! يمكنك الآن مشاهدته وتنزيله.');
          } else if (pollAttempts >= maxAttempts) {
            clearInterval(pollInterval);
            setIsLoading(false);
            throw new Error('استغرقت معالجة الفيديو وقتاً أطول من المتوقع.');
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setIsLoading(false);
          console.error('Polling error:', pollErr);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === modelMessageId
                ? {
                    ...msg,
                    content: `⚠️ فشل توليد الفيديو: ${pollErr.message || 'حدث خطأ'}`,
                    media: {
                      type: 'video',
                      status: 'failed',
                      error: pollErr.message,
                    },
                  }
                : msg
            )
          );
          showToast('⚠️ فشل توليد الفيديو');
        }
      }, 6000);
    } catch (err: any) {
      console.error('Video generation initiation error:', err);
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId
            ? {
                ...msg,
                content: `⚠️ تعذر بدء توليد الفيديو: ${err.message || 'حدث خطأ في الاتصال'}`,
                media: {
                  type: 'video',
                  status: 'failed',
                  error: err.message,
                },
              }
            : msg
        )
      );
      showToast('⚠️ فشل بدء توليد الفيديو');
    }
  };

  // Master send trigger dispatcher
  const handleMasterSend = (customText?: string) => {
    const textToSend = (customText || input).trim();
    if ((!textToSend && selectedImages.length === 0) || isLoading) return;

    if (inputMode === 'chat') {
      handleSendChat(textToSend);
    } else if (inputMode === 'image') {
      handleSendImage(textToSend);
    } else if (inputMode === 'video') {
      handleSendVideo(textToSend);
    }
  };

  // Action: Convert Image to Video (Image-to-Video)
  const handleConvertImageToVideo = (imageUrl: string, promptText?: string) => {
    setInputMode('video');
    setSelectedImages([{ data: imageUrl, mimeType: 'image/png' }]);
    setInput(promptText ? `تحريك مشهد: ${promptText}` : 'Cinematic realistic movement with dramatic camera pan and lighting');
    showToast('🎬 تم تحديد الصورة لتحويلها إلى فيديو. اضغط على "إنشاء فيديو" للبدء.');
    // Scroll to input box
    const inputElem = document.getElementById('chat-user-input');
    inputElem?.focus();
  };

  // Action: Regenerate Image
  const handleRegenerateImage = (promptText?: string) => {
    if (!promptText) return;
    setInputMode('image');
    setInput(promptText);
    handleSendImage(promptText);
  };

  // Action: Regenerate Video
  const handleRegenerateVideo = (promptText?: string) => {
    if (!promptText) return;
    setInputMode('video');
    setInput(promptText);
    handleSendVideo(promptText);
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

    const spoken = SpeechHelper.speakArabic(
      msg.content,
      () => setSpeakingMessageId(msg.id),
      () => setSpeakingMessageId(null)
    );

    if (!spoken) {
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

  // Copy text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('✓ تم نسخ النص إلى الحافظة');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear chat
  const handleClearChat = () => {
    SpeechHelper.stopSpeaking();
    const newWelcome: ChatMessage = {
      id: `new-chat-${Date.now()}`,
      role: 'model',
      content: 'تم بدء محادثة جديدة! يمكنك الآن كتابة نص، توليد صورة 🖼️، أو إنشاء فيديو 🎬 مباشرة من الشريط بالأسفل.',
      timestamp: new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      mediaType: 'text',
    };
    setMessages([newWelcome]);
    showToast('تم مسح سجل المحادثة');
  };

  // Handle Video Download
  const handleDownloadVideo = async (videoUrl: string, filename?: string) => {
    try {
      showToast('⏳ جاري تجهيز وتنزيل ملف الفيديو MP4...');
      await downloadVideoFile(videoUrl, filename);
      showToast('✓ تم بدء تنزيل الفيديو بنجاح');
    } catch (err: any) {
      console.error('Video download error:', err);
      showToast('⚠️ فشل تنزيل الفيديو');
    }
  };

  // Handle Image Download
  const handleDownloadImage = async (imageUrl: string, filename?: string) => {
    try {
      showToast('⏳ جاري تنزيل الصورة...');
      await downloadImageFile(imageUrl, filename);
      showToast('✓ تم تنزيل الصورة بنجاح');
    } catch (err: any) {
      console.error('Image download error:', err);
      showToast('⚠️ فشل تنزيل الصورة');
    }
  };

  // Handle Video Share
  const handleShareVideo = async (videoUrl: string, promptText?: string) => {
    const res = await shareVideo(videoUrl, 'فيديو تم إنشاؤه عبر Google Veo 3.1', promptText);
    showToast(res.message);
  };

  // Handle Image Share
  const handleShareImage = async (imageUrl: string, promptText?: string) => {
    const res = await shareImage(imageUrl, 'صورة بالذكاء الاصطناعي', promptText);
    showToast(res.message);
  };

  return (
    <div id="chat-studio-container" className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto w-full px-2 sm:px-4 py-1">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#11141B]/95 text-blue-300 border border-blue-500/40 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Mode Sub-Bar (for Chat Mode settings or Quick Actions) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#11141B] p-2 sm:p-2.5 border border-[#1F2937] mb-2 shadow-lg">
        {/* Dynamic Mode specific sub-controls */}
        {inputMode === 'chat' && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setChatMode('balanced')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.2 text-xs font-medium transition-all ${
                chatMode === 'balanced'
                  ? 'bg-[#1F2937] text-blue-400 font-semibold ring-1 ring-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]/50'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${chatMode === 'balanced' ? 'bg-blue-500' : 'bg-slate-600'}`} />
              <Zap className="h-3.5 w-3.5" />
              <span>متوازن وسريع</span>
            </button>

            <button
              onClick={() => setChatMode('deep')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.2 text-xs font-medium transition-all ${
                chatMode === 'deep'
                  ? 'bg-[#1F2937] text-blue-400 font-semibold ring-1 ring-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]/50'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${chatMode === 'deep' ? 'bg-blue-500' : 'bg-slate-600'}`} />
              <Brain className="h-3.5 w-3.5" />
              <span>تفكير عميق</span>
            </button>

            <button
              onClick={() => setChatMode('creative')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.2 text-xs font-medium transition-all ${
                chatMode === 'creative'
                  ? 'bg-[#1F2937] text-blue-400 font-semibold ring-1 ring-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]/50'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${chatMode === 'creative' ? 'bg-blue-500' : 'bg-slate-600'}`} />
              <PenTool className="h-3.5 w-3.5" />
              <span>إبداعي</span>
            </button>

            <button
              onClick={() => setChatMode('code')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.2 text-xs font-medium transition-all ${
                chatMode === 'code'
                  ? 'bg-[#1F2937] text-blue-400 font-semibold ring-1 ring-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]/50'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${chatMode === 'code' ? 'bg-blue-500' : 'bg-slate-600'}`} />
              <Code className="h-3.5 w-3.5" />
              <span>برمجة</span>
            </button>
          </div>
        )}

        {inputMode === 'image' && (
          <div className="flex items-center gap-2 text-xs text-slate-300 overflow-x-auto pb-1 sm:pb-0">
            <span className="flex items-center gap-1 text-blue-400 font-medium bg-blue-950/40 px-2.5 py-1 rounded-xl border border-blue-800/30">
              <ImageIcon className="h-3.5 w-3.5" /> وضع توليد الصور
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">
              اختر الأبعاد والنمط واكتب وصف المشهد المراد رسمه
            </span>
          </div>
        )}

        {inputMode === 'video' && (
          <div className="flex items-center gap-2 text-xs text-slate-300 overflow-x-auto pb-1 sm:pb-0">
            <span className="flex items-center gap-1 text-purple-400 font-medium bg-purple-950/40 px-2.5 py-1 rounded-xl border border-purple-800/30">
              <Film className="h-3.5 w-3.5 text-purple-400" /> محرك Google Veo 3.1
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">
              توليد فيديو سينمائي عالي الجودة مع تنزيل مباشر MP4
            </span>
          </div>
        )}

        {/* Right side global actions */}
        <div className="flex items-center gap-2 mr-auto">
          {inputMode === 'chat' && (
            <button
              onClick={() => setUseSearch(!useSearch)}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                useSearch
                  ? 'bg-blue-950/60 text-blue-400 border border-blue-500/40'
                  : 'text-slate-400 hover:bg-[#1F2937] hover:text-slate-200 border border-[#1F2937]'
              }`}
              title="تفعيل البحث بالويب لأحدث المعلومات"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>البحث بالويب {useSearch ? 'مفعل' : 'معطل'}</span>
            </button>
          )}

          <button
            onClick={handleClearChat}
            className="flex items-center gap-1 rounded-xl p-1.5 text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
            title="مسح المحادثة وبدء جلسة جديدة"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 py-2 pr-2">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isImageMedia = msg.media?.type === 'image';
          const isVideoMedia = msg.media?.type === 'video';

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-4 ${isUser ? 'flex-row-reverse max-w-4xl mr-auto' : 'flex-row max-w-4xl'}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isUser
                    ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30'
                    : isVideoMedia
                    ? 'bg-purple-950/60 text-purple-400 border border-purple-500/40'
                    : isImageMedia
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-[#1F2937]'
                }`}
              >
                {isUser ? 'أنت' : isVideoMedia ? 'Veo' : isImageMedia ? 'فن' : 'نبراس'}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`group relative max-w-[92%] sm:max-w-[85%] p-4 sm:p-5 transition-all ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tl-none shadow-xl shadow-blue-900/10'
                    : 'bg-[#11141B] border border-[#1F2937] text-slate-200 rounded-2xl rounded-tr-none shadow-lg'
                }`}
              >
                {/* User Attached Images if any */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {msg.images.map((imgSrc, idx) => (
                      <div key={idx} className="relative group/img cursor-pointer" onClick={() => setPreviewMediaUrl(imgSrc)}>
                        <img
                          src={imgSrc}
                          alt="مرفق"
                          className="max-h-44 max-w-full rounded-xl border border-slate-700 object-cover shadow-sm hover:opacity-90 transition"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Case 1: Video Media Bubble */}
                {isVideoMedia && msg.media && (
                  <div className="space-y-3">
                    {/* Video Generating State */}
                    {msg.media.status === 'generating' && (
                      <div className="rounded-xl bg-purple-950/20 border border-purple-500/30 p-4 text-center space-y-3">
                        <div className="flex items-center justify-center gap-2.5 text-purple-400">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          <span className="font-semibold text-sm sm:text-base">
                            جاري توليد الفيديو عبر Google Veo 3.1...
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {msg.media.statusMessage || 'جاري معالجة الإطارات والإضاءة والحركة السينمائية بدقة عالية...'}
                        </p>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-purple-500 h-full w-2/3 animate-pulse rounded-full" />
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          تستغرق عملية معالجة الفيديو عادة من 30 إلى 60 ثانية لضمان جودة سينمائية فائقة
                        </span>
                      </div>
                    )}

                    {/* Video Completed State */}
                    {msg.media.status === 'completed' && msg.media.url && (
                      <div className="space-y-3">
                        {/* Video Player Box */}
                        <div className="relative rounded-xl overflow-hidden bg-black border border-[#1F2937] shadow-xl group/vid">
                          <video
                            controls
                            playsInline
                            className="w-full max-h-[420px] object-contain mx-auto"
                            src={msg.media.url}
                          >
                            متصفحك لا يدعم تشغيل هذا الفيديو مباشرة.
                          </video>
                        </div>

                        {/* Large Clear Download Video Button */}
                        <button
                          id={`download-video-btn-${msg.id}`}
                          onClick={() => handleDownloadVideo(msg.media?.url!, msg.media?.filename)}
                          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-5 rounded-xl shadow-lg shadow-blue-600/25 transition-all text-sm sm:text-base transform active:scale-[0.99]"
                        >
                          <Download className="h-5 w-5" />
                          <span>⬇️ تنزيل الفيديو (MP4)</span>
                        </button>

                        {/* Secondary Actions Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => handleShareVideo(msg.media?.url!, msg.media?.prompt)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] text-slate-200 py-2 px-3 rounded-xl text-xs font-medium border border-[#374151] transition"
                            title="مشاركة الفيديو أو نسخ الرابط"
                          >
                            <Share2 className="h-3.5 w-3.5 text-blue-400" />
                            <span>مشاركة الفيديو</span>
                          </button>

                          <button
                            onClick={() => handleRegenerateVideo(msg.media?.prompt)}
                            className="flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] text-slate-200 py-2 px-3 rounded-xl text-xs font-medium border border-[#374151] transition"
                            title="إعادة توليد الفيديو"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-purple-400" />
                            <span>إعادة توليد</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Video Failed State */}
                    {msg.media.status === 'failed' && (
                      <div className="rounded-xl bg-red-950/30 border border-red-500/40 p-3.5 text-red-200 text-xs sm:text-sm flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                          <span>{msg.media.error || 'تعذر توليد الفيديو'}</span>
                        </div>
                        <button
                          onClick={() => handleRegenerateVideo(msg.media?.prompt)}
                          className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 rounded-lg text-xs font-medium transition"
                        >
                          إعادة المحاولة
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Case 2: Image Media Bubble */}
                {isImageMedia && msg.media && (
                  <div className="space-y-3">
                    {/* Image Generating State */}
                    {msg.media.status === 'generating' && (
                      <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-4 text-center space-y-2.5">
                        <div className="flex items-center justify-center gap-2 text-emerald-400">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          <span className="font-semibold text-sm sm:text-base">
                            جاري رسم وتوليد الصورة بالذكاء الاصطناعي...
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          معالجة التفاصيل الدقيقة والأبعاد ({msg.media.aspectRatio}) بالنمط ({msg.media.style})...
                        </p>
                      </div>
                    )}

                    {/* Image Completed State */}
                    {msg.media.status === 'completed' && msg.media.url && (
                      <div className="space-y-3">
                        <div
                          className="relative rounded-xl overflow-hidden bg-black border border-[#1F2937] shadow-lg group/img cursor-pointer"
                          onClick={() => setPreviewMediaUrl(msg.media?.url!)}
                        >
                          <img
                            src={msg.media.url}
                            alt={msg.media.prompt || 'Generated Image'}
                            className="w-full max-h-[380px] object-contain mx-auto transition-transform duration-300 group-hover/img:scale-[1.02]"
                          />
                        </div>

                        {/* Image Action Buttons Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          <button
                            onClick={() => handleDownloadImage(msg.media?.url!)}
                            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2 px-2.5 rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition"
                            title="تنزيل الصورة بجودة كاملة"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>تنزيل الصورة</span>
                          </button>

                          <button
                            onClick={() => handleConvertImageToVideo(msg.media?.url!, msg.media?.prompt)}
                            className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white py-2 px-2.5 rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 transition"
                            title="تحويل الصورة إلى فيديو عبر Veo 3.1"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>تحويل لفيديو</span>
                          </button>

                          <button
                            onClick={() => handleRegenerateImage(msg.media?.prompt)}
                            className="flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] text-slate-200 py-2 px-2 rounded-xl text-xs font-medium border border-[#374151] transition"
                            title="إعادة توليد صورة أخرى"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                            <span>إعادة توليد</span>
                          </button>

                          <button
                            onClick={() => handleShareImage(msg.media?.url!, msg.media?.prompt)}
                            className="flex items-center justify-center gap-1.5 bg-[#1F2937] hover:bg-[#374151] text-slate-200 py-2 px-2 rounded-xl text-xs font-medium border border-[#374151] transition"
                            title="مشاركة الصورة"
                          >
                            <Share2 className="h-3.5 w-3.5 text-blue-400" />
                            <span>مشاركة</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Image Failed State */}
                    {msg.media.status === 'failed' && (
                      <div className="rounded-xl bg-red-950/30 border border-red-500/40 p-3.5 text-red-200 text-xs sm:text-sm flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                          <span>{msg.media.error || 'تعذر توليد الصورة'}</span>
                        </div>
                        <button
                          onClick={() => handleRegenerateImage(msg.media?.prompt)}
                          className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 rounded-lg text-xs font-medium transition"
                        >
                          إعادة المحاولة
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Markdown text / Chat description */}
                {msg.content && (!msg.media || msg.media.status === 'completed' || msg.role === 'user') && (
                  <div className="text-sm sm:text-base leading-relaxed break-words markdown-content space-y-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {/* Footer details & Action Buttons */}
                <div
                  className={`mt-3 flex items-center justify-between gap-3 text-xs border-t pt-2.5 ${
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

        {/* Global Loading Spinner for general streaming */}
        {isLoading && inputMode === 'chat' && (
          <div className="flex gap-3 sm:gap-4 items-center max-w-4xl">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-[#1F2937] text-blue-400 text-xs font-bold animate-pulse">
              نبراس
            </div>
            <div className="rounded-2xl rounded-tr-none bg-[#11141B] border border-[#1F2937] p-3.5 sm:p-4 text-sm text-slate-300 flex items-center gap-2.5 shadow-lg">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              <span>جاري التحليل وصياغة الرد الفصيح...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Uploaded Images Preview Strip */}
      {selectedImages.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-[#11141B] border border-[#1F2937] rounded-xl mb-1.5 overflow-x-auto">
          <span className="text-xs text-slate-400 px-1 shrink-0">
            {inputMode === 'video' ? '🎬 صورة مرجعية للتحريك:' : inputMode === 'image' ? '🖼️ صورة مرجعية للتعديل:' : '📎 المرفقات:'}
          </span>
          {selectedImages.map((img, idx) => (
            <div key={idx} className="relative group shrink-0">
              <img
                src={img.data}
                alt="مرفق"
                className="h-14 w-14 object-cover rounded-lg border border-blue-500/50 shadow"
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

      {/* Mode-Specific Quick Configuration Bar (appears above input when in Image or Video mode) */}
      {inputMode === 'image' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#11141B] border border-b-0 border-[#1F2937] rounded-t-2xl text-xs">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">الأبعاد:</span>
            <div className="flex items-center bg-[#1F2937] p-0.5 rounded-lg border border-[#374151]">
              {(['1:1', '16:9', '9:16', '4:3'] as AspectRatio[]).map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setImageAspectRatio(ar)}
                  className={`px-2 py-1 rounded-md transition font-medium text-[11px] ${
                    imageAspectRatio === ar
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* Style Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">النمط:</span>
            <select
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
              className="bg-[#1F2937] text-slate-200 border border-[#374151] rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="realistic">واقعي سينمائي</option>
              <option value="islamic_art">فن وزخارف إسلامية</option>
              <option value="digital_art">رسم رقمي (ArtStation)</option>
              <option value="anime">أنمي ياباني</option>
              <option value="three_d">مجسم ثلاثي الأبعاد 3D</option>
              <option value="logo">شعار ولوجو فكتور</option>
            </select>
          </div>
        </div>
      )}

      {inputMode === 'video' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#11141B] border border-b-0 border-[#1F2937] rounded-t-2xl text-xs">
          {/* Video Aspect Ratio */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">أبعاد الفيديو:</span>
            <div className="flex items-center bg-[#1F2937] p-0.5 rounded-lg border border-[#374151]">
              <button
                type="button"
                onClick={() => setVideoAspectRatio('16:9')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
                  videoAspectRatio === '16:9'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="h-3 w-3" />
                <span>16:9 عرضي (سينمائي)</span>
              </button>
              <button
                type="button"
                onClick={() => setVideoAspectRatio('9:16')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
                  videoAspectRatio === '9:16'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                <span>9:16 طولي (ريلز/شورتس)</span>
              </button>
            </div>
          </div>

          {/* Resolution Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">الدقة:</span>
            <div className="flex items-center bg-[#1F2937] p-0.5 rounded-lg border border-[#374151]">
              <button
                type="button"
                onClick={() => setVideoResolution('720p')}
                className={`px-2 py-1 rounded-md transition font-medium text-[11px] ${
                  videoResolution === '720p'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                720p HD
              </button>
              <button
                type="button"
                onClick={() => setVideoResolution('1080p')}
                className={`px-2 py-1 rounded-md transition font-medium text-[11px] ${
                  videoResolution === '1080p'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1080p FHD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Box Area */}
      <div
        className={`relative bg-[#11141B] border border-[#1F2937] p-2.5 shadow-2xl transition-all ${
          inputMode === 'chat'
            ? 'rounded-t-2xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'
            : inputMode === 'image'
            ? 'focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500'
            : 'focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500'
        }`}
      >
        <textarea
          id="chat-user-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleMasterSend();
            }
          }}
          placeholder={
            inputMode === 'chat'
              ? 'اكتب رسالتك هنا للمحادثة أو الاستفسار أو كتابة المحتوى... (Enter للإرسال)'
              : inputMode === 'image'
              ? 'اكتب وصف الصورة التي ترغب في إنشائها... (مثال: صقر عربي يحلق في سماء دبي وقت الغروب بدقة 8K)'
              : 'اكتب وصف الفيديو لتوليده بمحرك Veo 3.1... (مثال: لقطة سينمائية لخيول عربية تركض على رمال الصحراء الذهبية)'
          }
          rows={2}
          className="w-full resize-none bg-transparent px-3 py-1.5 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />

        {/* Action Buttons inside Input Box */}
        <div className="flex items-center justify-between border-t border-[#1F2937] pt-2 px-1">
          {/* Left tools (Voice, File attachment, Prompt Enhancer) */}
          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />

            {/* Attach Image Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-slate-400 hover:bg-[#1F2937] hover:text-slate-200 transition-all text-xs font-medium border border-transparent hover:border-[#1F2937]"
              title={
                inputMode === 'video'
                  ? 'إرفاق صورة لتحويلها إلى فيديو (Image-to-Video)'
                  : inputMode === 'image'
                  ? 'إرفاق صورة مرجعية للتعديل عليها'
                  : 'إرفاق صورة للتحليل البصري'
              }
            >
              <Paperclip className="h-4 w-4 text-blue-400" />
              <span className="hidden sm:inline">
                {inputMode === 'video' ? 'صورة للتحريك' : inputMode === 'image' ? 'صورة مرجعية' : 'إرفاق صورة'}
              </span>
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
                  <span className="hidden sm:inline">صوت</span>
                </>
              )}
            </button>

            {/* Magic Prompt Enhancer Button */}
            <button
              type="button"
              onClick={handleEnhancePrompt}
              disabled={!input.trim() || isEnhancingPrompt}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-slate-400 hover:bg-[#1F2937] hover:text-yellow-300 transition-all text-xs font-medium border border-transparent hover:border-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed"
              title="تحسين البرومبت وصياغته بطريقة احترافية"
            >
              <Wand2 className={`h-3.5 w-3.5 text-yellow-400 ${isEnhancingPrompt ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحسين الوصف</span>
            </button>
          </div>

          {/* Send Button */}
          <button
            id="send-chat-btn"
            onClick={() => handleMasterSend()}
            disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              inputMode === 'chat'
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                : inputMode === 'image'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/20'
            }`}
          >
            {inputMode === 'chat' ? (
              <>
                <span>إرسال</span>
                <Send className="h-4 w-4 rotate-180" />
              </>
            ) : inputMode === 'image' ? (
              <>
                <span>✨ إنشاء صورة</span>
                <Sparkles className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>🎬 إنشاء فيديو</span>
                <Film className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* REQUIRED USER TOOLBAR: 💬 محادثة | 🖼️ إنشاء صورة | 🎬 إنشاء فيديو */}
      <div className="flex items-center justify-around bg-[#11141B] border-t-0 border border-[#1F2937] rounded-b-2xl p-1.5 sm:p-2 shadow-xl">
        {/* Mode 1: Chat */}
        <button
          id="mode-chat-tab"
          type="button"
          onClick={() => setInputMode('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
            inputMode === 'chat'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>💬 محادثة</span>
        </button>

        {/* Mode 2: Image Gen */}
        <button
          id="mode-image-tab"
          type="button"
          onClick={() => setInputMode('image')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
            inputMode === 'image'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>🖼️ إنشاء صورة</span>
        </button>

        {/* Mode 3: Video Gen */}
        <button
          id="mode-video-tab"
          type="button"
          onClick={() => setInputMode('video')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
            inputMode === 'video'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F2937]'
          }`}
        >
          <Film className="h-4 w-4" />
          <span>🎬 إنشاء فيديو</span>
        </button>
      </div>

      {/* Lightbox Image / Media Zoom Modal */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute -top-12 right-0 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full transition shadow-lg"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewMediaUrl}
              alt="Preview"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain border border-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleDownloadImage(previewMediaUrl)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition"
              >
                <Download className="h-4 w-4" />
                <span>تنزيل الصورة</span>
              </button>
              <button
                onClick={() => handleConvertImageToVideo(previewMediaUrl)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition"
              >
                <Video className="h-4 w-4" />
                <span>تحويل إلى فيديو (Veo 3.1)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
