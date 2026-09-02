import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Clapperboard,
  Video,
  Layers,
  Volume2,
  Copy,
  Check,
  Download,
  Clock,
  Camera,
  Music,
  Share2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Trash2,
  ExternalLink,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { VideoStoryboard, VideoScene, GeneratedVideo } from '../types';
import { apiService } from '../services/api';
import { SpeechHelper } from '../services/speech';
import { storageService } from '../services/storage';
import { downloadVideoFile, shareVideo, generateVideoFilename } from '../utils/videoUtils';

interface VideoStudioProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

type DownloadState = 'idle' | 'downloading' | 'success' | 'error';

const SAMPLE_VEO_PROMPTS = [
  {
    title: 'واحة مستقبلية عند الغسق',
    prompt: 'A hyper-realistic 4K cinematic drone shot gliding smoothly over golden desert sand dunes at sunset, revealing a glowing futuristic oasis with glowing neon waterways and crystal architecture, highly detailed, photorealistic 8k.',
    ratio: '16:9' as const,
  },
  {
    title: 'خيل عربي أصيل في الشروق',
    prompt: 'A majestic purebred black Arabian stallion galloping powerfully across misty golden sand at dawn, dust particles floating in sunlight, ultra slow motion 120fps, cinematic lighting, 8k resolution.',
    ratio: '16:9' as const,
  },
  {
    title: 'مدينة الرياض الذكية 2030 (طولي)',
    prompt: 'Vertical 9:16 cinematic video soaring up through futuristic Riyadh skyscrapers with lush sky gardens, holographic signage, flying electric transit vehicles, warm twilight sky.',
    ratio: '9:16' as const,
  },
  {
    title: 'رائد فضاء يكتشف حضارة قديمة',
    prompt: 'Close up cinematic 4k footage of an astronaut touching ancient glowing Arabic calligraphy carved into glowing alien crystal ruins, dramatic rim lighting, cinematic depth of field.',
    ratio: '16:9' as const,
  },
];

export const VideoStudio: React.FC<VideoStudioProps> = ({
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'storyboard' | 'veo_generator'>('storyboard');

  // Storyboard state
  const [topic, setTopic] = useState(initialPrompt || '');
  const [duration, setDuration] = useState('30s');
  const [tone, setTone] = useState('سينمائي وحماسي');
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboard, setStoryboard] = useState<VideoStoryboard | null>(() => {
    const list = storageService.getStoryboards();
    return list.length > 0 ? list[0] : null;
  });

  // Timeline / Visual Simulation Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [copiedSceneIndex, setCopiedSceneIndex] = useState<number | null>(null);

  // Veo Direct Video Generator State
  const [veoPrompt, setVeoPrompt] = useState('');
  const [veoAspectRatio, setVeoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [veoResolution, setVeoResolution] = useState<'720p' | '1080p'>('720p');
  const [isGeneratingVeo, setIsGeneratingVeo] = useState(false);
  const [veoStatusMessage, setVeoStatusMessage] = useState<string>('');

  // Generated Videos List & Active Video Player State
  const [savedVideos, setSavedVideos] = useState<GeneratedVideo[]>(() => {
    const stored = storageService.getVideos();
    if (stored.length > 0) return stored;
    // Initial sample video for immediate preview
    return [
      {
        id: 'vid-demo-1',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        prompt: 'A cinematic drone shot gliding smoothly over glowing desert dunes into a futuristic metropolis, golden hour twilight, 4K.',
        aspectRatio: '16:9',
        resolution: '1080p',
        createdAt: 'اليوم',
        duration: '15s',
      },
    ];
  });

  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(() => {
    const list = storageService.getVideos();
    if (list.length > 0) return list[0];
    return {
      id: 'vid-demo-1',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      prompt: 'A cinematic drone shot gliding smoothly over glowing desert dunes into a futuristic metropolis, golden hour twilight, 4K.',
      aspectRatio: '16:9',
      resolution: '1080p',
      createdAt: 'اليوم',
      duration: '15s',
    };
  });

  // Download & Share states
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<{ show: boolean; message: string; success: boolean }>({
    show: false,
    message: '',
    success: true,
  });

  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);

  // Sync initial prompt from template
  useEffect(() => {
    if (initialPrompt) {
      setTopic(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  // Handle Playback Simulation for Storyboard Scenes
  useEffect(() => {
    if (isPlaying && storyboard && storyboard.scenes.length > 0) {
      const scene = storyboard.scenes[currentSceneIndex];
      // Read current scene's voiceover
      if (scene?.voiceoverArabic) {
        SpeechHelper.speakArabic(
          scene.voiceoverArabic,
          () => {},
          () => {}
        );
      }

      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            // Next scene or loop
            if (currentSceneIndex < storyboard.scenes.length - 1) {
              setCurrentSceneIndex((idx) => idx + 1);
              return 0;
            } else {
              setIsPlaying(false);
              SpeechHelper.stopSpeaking();
              return 100;
            }
          }
          return prev + 2.5;
        });
      }, 150);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentSceneIndex, storyboard]);

  // Handle Generate Storyboard
  const handleGenerateStoryboard = async () => {
    if (!topic.trim() || isGeneratingStoryboard) return;
    setIsGeneratingStoryboard(true);
    SpeechHelper.stopSpeaking();
    setIsPlaying(false);

    try {
      const res = await apiService.generateStoryboard(topic, duration, tone);
      if (res.success && res.storyboard) {
        const fullStoryboard: VideoStoryboard = {
          id: `sb-${Date.now()}`,
          title: res.storyboard.title || 'سيناريو فيديو متكامل',
          logline: res.storyboard.logline || topic,
          mood: res.storyboard.mood || tone,
          totalDuration: res.storyboard.totalDuration || duration,
          scenes: res.storyboard.scenes || [],
          createdAt: new Date().toLocaleDateString('ar-SA'),
          originalTopic: topic,
        };

        setStoryboard(fullStoryboard);
        storageService.saveStoryboard(fullStoryboard);
        setCurrentSceneIndex(0);
        setProgress(0);
      }
    } catch (err: any) {
      alert(`حدث خطأ أثناء كتابة السيناريو: ${err.message}`);
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  // Toggle Play / Pause in Storyboard Simulator
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      SpeechHelper.stopSpeaking();
    } else {
      if (progress >= 100) {
        setProgress(0);
        setCurrentSceneIndex(0);
      }
      setIsPlaying(true);
    }
  };

  const restartPlayer = () => {
    SpeechHelper.stopSpeaking();
    setIsPlaying(false);
    setProgress(0);
    setCurrentSceneIndex(0);
  };

  // Copy scene's Veo prompt
  const handleCopyVeoPrompt = (index: number, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedSceneIndex(index);
    setTimeout(() => setCopiedSceneIndex(null), 2000);
  };

  // Direct Veo Generation
  const handleGenerateVeo = async () => {
    if (!veoPrompt.trim() || isGeneratingVeo) return;
    setIsGeneratingVeo(true);
    setVeoStatusMessage('جاري تهيئة نموذج Google Veo 3.1 وإرسال وصف المشهد...');

    try {
      const res = await apiService.generateVeoVideo(veoPrompt, veoAspectRatio, veoResolution);
      
      if (res.success && res.operationName) {
        setVeoStatusMessage('جاري محاكاة وحساب حركة الكاميرا والإضاءة الفيزيائية...');

        // Poll for video generation completion (Veo 3.1 long-running operation)
        let attempts = 0;
        const maxAttempts = 40; // 40 * 7s = ~4.5 minutes safe polling window

        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await apiService.checkVideoStatus(res.operationName);

            // If operation returned an explicit error, stop polling and show user-friendly message
            if (statusRes.error) {
              clearInterval(pollInterval);
              setIsGeneratingVeo(false);
              const errMsg = typeof statusRes.error === 'string' 
                ? statusRes.error 
                : statusRes.error.message || 'حدث خطأ أثناء معالجة الفيديو';
              setVeoStatusMessage(`خطأ: ${errMsg}`);
              return;
            }

            if (statusRes.done) {
              clearInterval(pollInterval);
              setIsGeneratingVeo(false);

              const generatedUrl = statusRes.videoUrl || statusRes.downloadUrl;

              if (generatedUrl) {
                const newVideo: GeneratedVideo = {
                  id: `vid-${Date.now()}`,
                  url: generatedUrl,
                  prompt: veoPrompt,
                  aspectRatio: veoAspectRatio,
                  resolution: veoResolution,
                  createdAt: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                  duration: '15s',
                  operationName: res.operationName,
                };

                setCurrentVideo(newVideo);
                storageService.saveVideo(newVideo);
                setSavedVideos(storageService.getVideos());
                setVeoStatusMessage('✓ تم توليد الفيديو بنجاح بواسطة Veo 3.1! جاهز للمشاهدة والتنزيل.');
              } else {
                setVeoStatusMessage('اكتملت العملية ولكن لم يتم استرجاع رابط الفيديو. يرجى المحاولة لاحقاً.');
              }
            } else {
              if (attempts % 3 === 0) {
                setVeoStatusMessage('جاري ريندر الإطارات السينمائية وحفظ ملف MP4...');
              } else if (attempts % 3 === 1) {
                setVeoStatusMessage('جاري محاكاة حركة الكاميرا والفيزياء بالذكاء الاصطناعي...');
              } else {
                setVeoStatusMessage('جاري تجميع وضبط المشهد بجودة سينمائية عالية...');
              }

              if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                setIsGeneratingVeo(false);
                setVeoStatusMessage('استغرق التوليد وقتاً طويلاً. تم حفظ طلب العملية في الخلفية.');
              }
            }
          } catch (e: any) {
            console.error('Polling error:', e);
            clearInterval(pollInterval);
            setIsGeneratingVeo(false);
            setVeoStatusMessage(`خطأ: ${e.message || 'حدث خطأ أثناء فحص حالة الفيديو'}`);
          }
        }, 7000);
      } else {
        setIsGeneratingVeo(false);
        setVeoStatusMessage('تعذر بدء عملية توليد الفيديو عبر نموذج Veo 3.1.');
      }
    } catch (err: any) {
      setIsGeneratingVeo(false);
      setVeoStatusMessage(`خطأ: ${err.message || 'تعذر توليد الفيديو'}`);
    }
  };

  // Video Download Handler with 4 explicit states
  const handleDownloadVideo = async (videoToDownload?: GeneratedVideo) => {
    const target = videoToDownload || currentVideo;
    if (!target || !target.url) {
      setDownloadState('error');
      setTimeout(() => setDownloadState('idle'), 3000);
      return;
    }

    setDownloadingVideoId(target.id);
    setDownloadState('downloading');

    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const filename = `AI_Video_${timestamp}.mp4`;

      await downloadVideoFile(target.url, filename);

      setDownloadState('success');
      showToast('✓ تم تنزيل ملف الفيديو (MP4) بنجاح وحفظه في جهازك', true);

      setTimeout(() => {
        setDownloadState('idle');
        setDownloadingVideoId(null);
      }, 3500);
    } catch (error: any) {
      console.error('Video download failed:', error);
      setDownloadState('error');
      showToast('✕ فشل تنزيل الفيديو، حاول مرة أخرى', false);

      setTimeout(() => {
        setDownloadState('idle');
        setDownloadingVideoId(null);
      }, 4000);
    }
  };

  // Video Share Handler
  const handleShareVideo = async (videoToShare?: GeneratedVideo) => {
    const target = videoToShare || currentVideo;
    if (!target || !target.url) return;

    try {
      const res = await shareVideo(
        target.url,
        'فيديو سينمائي مولّد بالذكاء الاصطناعي Veo 3.1',
        target.prompt
      );
      showToast(res.message, res.success);
    } catch (err: any) {
      showToast('تعذر إتمام المشاركة', false);
    }
  };

  // Delete Video Handler
  const handleDeleteVideo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storageService.deleteVideo(id);
    const updated = storageService.getVideos();
    setSavedVideos(updated);
    if (currentVideo?.id === id) {
      setCurrentVideo(updated.length > 0 ? updated[0] : null);
    }
    showToast('تم حذف الفيديو من المعرض', true);
  };

  const showToast = (message: string, success: boolean) => {
    setShareToast({ show: true, message, success });
    setTimeout(() => {
      setShareToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const currentScene: VideoScene | undefined = storyboard?.scenes?.[currentSceneIndex];

  return (
    <div id="video-studio-container" className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-4 space-y-6">
      {/* Toast Notification */}
      {shareToast.show && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-2xl text-sm font-bold backdrop-blur-md transition-all border ${
            shareToast.success
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-950/50'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-950/50'
          }`}
        >
          {shareToast.success ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{shareToast.message}</span>
        </div>
      )}

      {/* Studio Header */}
      <div className="rounded-2xl bg-[#11141B] p-5 border border-[#1F2937] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/30">
              <Film className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-bold text-white">استوديو الفيديو وصناعة السيناريو</h2>
          </div>
          <p className="text-sm text-slate-300">
            ابتكر سيناريوهات فيديو سينمائية، وولد مقاطع Veo 3.1 مباشرة مع مشغل فيديو متطور وتنزيل فوري بصيغة MP4.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-[#0A0C10] p-1 border border-[#1F2937] self-start sm:self-auto">
          <button
            id="tab-storyboard-btn"
            onClick={() => setActiveSubTab('storyboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'storyboard'
                ? 'bg-[#1F2937] text-blue-400 border border-blue-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clapperboard className="h-3.5 w-3.5" />
            <span>القصة المصورة والسيناريو</span>
          </button>

          <button
            id="tab-veo-btn"
            onClick={() => setActiveSubTab('veo_generator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'veo_generator'
                ? 'bg-[#1F2937] text-blue-400 border border-blue-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>توليد وتنزيل Veo 3.1</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'storyboard' ? (
        <div className="space-y-6">
          {/* Top Generator Card */}
          <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-blue-400" />
              <span>حدد فكرة أو موضوع الفيديو</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <textarea
                  id="video-topic-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="اكتب فكرة الفيديو، مثلاً: إعلان سينمائي لتطبيق رقمي يربط بين الحرفيين والزبائن في العالم العربي، أو فيلم وثائقي عن مستقبل الذكاء الاصطناعي في الطاقة المتجددة..."
                  rows={3}
                  className="w-full resize-none rounded-xl bg-[#0A0C10] border border-[#1F2937] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-4 space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">المدة المقترحة</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl bg-[#0A0C10] border border-[#1F2937] p-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="15s">15 ثانية (سريع / ريلز وتيك توك)</option>
                    <option value="30s">30 ثانية (إعلان ترويجي قياسي)</option>
                    <option value="60s">60 ثانية (شرح تفصيلي أو قصة)</option>
                    <option value="90s">90 ثانية (فيلم وثائقي قصير)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">الطابع والأسلوب</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-xl bg-[#0A0C10] border border-[#1F2937] p-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="سينمائي وحماسي">سينمائي وحماسي (Cinematic & Inspiring)</option>
                    <option value="وثائقي هادئ ودافئ">وثائقي هادئ ودافئ (Documentary)</option>
                    <option value="تجاري وإعلاني حديث">تجاري وإعلاني حديث (Modern Commercial)</option>
                    <option value="تعليمي مبسط ومباشر">تعليمي مبسط ومباشر (Educational Explainer)</option>
                    <option value="درامي وغامض">درامي وغامض (Dramatic & Mysterious)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="generate-storyboard-btn"
                onClick={handleGenerateStoryboard}
                disabled={!topic.trim() || isGeneratingStoryboard}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGeneratingStoryboard ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري إخراج وتأليف السيناريو والمشاهد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>توليد السيناريو والقصة المصورة</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* If Storyboard Exists: Interactive Player & Scene Canvas */}
          {storyboard && storyboard.scenes && storyboard.scenes.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive Visual Simulator (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between mb-3 border-b border-[#1F2937] pb-2">
                    <div>
                      <h4 className="text-base font-bold text-white">{storyboard.title}</h4>
                      <p className="text-xs text-blue-400">{storyboard.logline}</p>
                    </div>
                    <span className="text-xs bg-[#0A0C10] border border-[#1F2937] text-slate-300 px-2.5 py-1 rounded-lg">
                      {storyboard.totalDuration}
                    </span>
                  </div>

                  {/* Cinematic Scene Screen Canvas */}
                  <div
                    className="relative aspect-video w-full rounded-xl overflow-hidden flex flex-col justify-between p-5 border border-[#1F2937] shadow-2xl transition-all duration-700"
                    style={{
                      background: currentScene?.keyframeColor
                        ? `linear-gradient(135deg, ${currentScene.keyframeColor}22, #0A0C10)`
                        : 'linear-gradient(135deg, #11141B, #0A0C10)',
                    }}
                  >
                    {/* Top Overlay Badge */}
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 bg-[#0A0C10]/80 backdrop-blur px-2.5 py-1 rounded-lg border border-[#1F2937] font-mono text-blue-400">
                        <Clock className="h-3 w-3" />
                        المشهد {currentScene?.sceneNumber} من {storyboard.scenes.length} ({currentScene?.timestamp})
                      </span>

                      <span className="flex items-center gap-1 bg-[#0A0C10]/80 backdrop-blur px-2.5 py-1 rounded-lg border border-[#1F2937] text-slate-300">
                        <Camera className="h-3 w-3 text-blue-400" />
                        {currentScene?.cameraAngle}
                      </span>
                    </div>

                    {/* Center: Visual Representation Simulation */}
                    <div className="my-auto text-center space-y-2 py-4">
                      <div className="inline-block rounded-2xl bg-[#0A0C10]/80 backdrop-blur-md p-4 border border-[#1F2937] max-w-lg shadow-xl">
                        <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                          {currentScene?.visualDescription}
                        </p>
                      </div>
                    </div>

                    {/* Bottom: Arabic Voiceover Subtitle Overlay */}
                    <div className="rounded-xl bg-[#0A0C10]/90 backdrop-blur-md p-3 border border-blue-500/30 text-center space-y-1 shadow-lg">
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-400">
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>التعليق الصوتي (Voiceover):</span>
                      </div>
                      <p className="text-sm text-slate-100 font-medium">
                        "{currentScene?.voiceoverArabic}"
                      </p>
                      {currentScene?.soundEffects && (
                        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                          <Music className="h-3 w-3 text-blue-400/80" />
                          المؤثرات: {currentScene.soundEffects}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Player Progress Bar */}
                  <div className="w-full bg-[#0A0C10] h-1.5 rounded-full my-3 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Player Controls Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (currentSceneIndex > 0) {
                            setCurrentSceneIndex((i) => i - 1);
                            setProgress(0);
                          }
                        }}
                        disabled={currentSceneIndex === 0}
                        className="p-2 rounded-xl bg-[#0A0C10] border border-[#1F2937] text-slate-300 hover:text-white disabled:opacity-30 transition"
                        title="المشهد السابق"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      <button
                        onClick={togglePlay}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 text-white font-bold px-4 py-2 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-4 w-4 fill-current" />
                            <span>إيقاف مؤقت</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current" />
                            <span>تشغيل المحاكاة الصوتية</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (currentSceneIndex < storyboard.scenes.length - 1) {
                            setCurrentSceneIndex((i) => i + 1);
                            setProgress(0);
                          }
                        }}
                        disabled={currentSceneIndex === storyboard.scenes.length - 1}
                        className="p-2 rounded-xl bg-[#0A0C10] border border-[#1F2937] text-slate-300 hover:text-white disabled:opacity-30 transition"
                        title="المشهد التالي"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <button
                        onClick={restartPlayer}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#1F2937] transition"
                        title="إعادة البدء"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (currentScene?.veoPromptEnglish) {
                          setVeoPrompt(currentScene.veoPromptEnglish);
                          setActiveSubTab('veo_generator');
                        }
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 bg-blue-950/50 px-3 py-1.5 rounded-lg border border-blue-800/40 font-medium transition"
                    >
                      توليد هذا المشهد في Veo ←
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Scene Timeline & Prompt Exporter (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-400" />
                    <span>جدول المشاهد والبرومبتات</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    {storyboard.scenes.length} مشاهد
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {storyboard.scenes.map((scene, idx) => {
                    const isSelected = currentSceneIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setCurrentSceneIndex(idx);
                          setProgress(0);
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-[#11141B] border-blue-500 ring-1 ring-blue-500/30'
                            : 'bg-[#11141B]/60 border-[#1F2937] hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/40 flex items-center justify-center text-[10px]">
                              {scene.sceneNumber}
                            </span>
                            <span>المشهد {scene.sceneNumber}</span>
                          </span>
                          <span className="text-slate-400 font-mono">{scene.timestamp}</span>
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-2">
                          {scene.visualDescription}
                        </p>

                        <div className="rounded-lg bg-[#0A0C10] p-2 border border-[#1F2937] text-[11px] font-mono text-slate-400 dir-ltr text-left">
                          <div className="flex items-center justify-between mb-1 text-slate-500">
                            <span>Veo / AI Prompt:</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyVeoPrompt(idx, scene.veoPromptEnglish);
                              }}
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              {copiedSceneIndex === idx ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span>نسخ</span>
                            </button>
                          </div>
                          <p className="line-clamp-2">{scene.veoPromptEnglish}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Veo Video Generator & Video Player Tab */
        <div className="space-y-6">
          {/* Main Grid: Left is Video Player & Actions, Right is Prompt Generator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Generator Form (5 Columns) */}
            <div className="lg:col-span-5 rounded-2xl bg-[#11141B] border border-[#1F2937] p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">توليد فيديو بنموذج Veo 3.1</h3>
                </div>
                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded-full font-bold">
                  Veo 3.1 Preview
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                أدخل وصف المشهد بدقة لتوليد فيديو سينمائي عالي الجودة يدعم التنزيل المباشر بصيغة MP4.
              </p>

              {/* Sample Prompts Quick Picker */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                  نماذج سريعة جاهزة للتجربة:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SAMPLE_VEO_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setVeoPrompt(item.prompt);
                        setVeoAspectRatio(item.ratio);
                      }}
                      className="p-2 rounded-xl bg-[#0A0C10] border border-[#1F2937] hover:border-blue-500/50 hover:bg-blue-950/20 text-right transition-all text-xs group"
                    >
                      <span className="font-semibold text-slate-200 group-hover:text-blue-300 block truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.ratio}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  وصف المشهد بالإنجليزية (Veo Prompt):
                </label>
                <textarea
                  id="veo-prompt-input"
                  value={veoPrompt}
                  onChange={(e) => setVeoPrompt(e.target.value)}
                  placeholder="A cinematic drone shot flying over ancient sand dunes with glowing golden lanterns at twilight, 4k ultra-realistic..."
                  rows={4}
                  className="w-full resize-none rounded-xl bg-[#0A0C10] border border-[#1F2937] p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none dir-ltr text-left font-mono"
                />
              </div>

              {/* Options: Aspect Ratio & Resolution */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">أبعاد الفيديو</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setVeoAspectRatio('16:9')}
                      className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                        veoAspectRatio === '16:9'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                          : 'bg-[#0A0C10] border-[#1F2937] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      16:9 عريض
                    </button>
                    <button
                      onClick={() => setVeoAspectRatio('9:16')}
                      className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                        veoAspectRatio === '9:16'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                          : 'bg-[#0A0C10] border-[#1F2937] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      9:16 طولي
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">الدقة</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setVeoResolution('720p')}
                      className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                        veoResolution === '720p'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                          : 'bg-[#0A0C10] border-[#1F2937] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      720p HD
                    </button>
                    <button
                      onClick={() => setVeoResolution('1080p')}
                      className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                        veoResolution === '1080p'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                          : 'bg-[#0A0C10] border-[#1F2937] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      1080p FHD
                    </button>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                id="generate-veo-video-btn"
                onClick={handleGenerateVeo}
                disabled={!veoPrompt.trim() || isGeneratingVeo}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGeneratingVeo ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري معالجة وتوليد الفيديو...</span>
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    <span>بدء توليد مقطع Veo 3.1</span>
                  </>
                )}
              </button>

              {/* Status Feedback Message */}
              {veoStatusMessage && (
                <div className="rounded-xl bg-[#0A0C10] p-3.5 border border-blue-500/20 text-xs text-slate-300 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{veoStatusMessage}</p>
                </div>
              )}
            </div>

            {/* Video Player Display & Download Section (7 Columns) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-blue-400" />
                    <h3 className="text-base font-bold text-white">
                      مشغل الفيديو السينمائي (Video Player)
                    </h3>
                  </div>

                  {currentVideo && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] bg-[#0A0C10] border border-[#1F2937] text-slate-300 px-2 py-0.5 rounded-md font-mono">
                        {currentVideo.resolution}
                      </span>
                      <span className="text-[11px] bg-blue-950 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded-md font-mono">
                        {currentVideo.aspectRatio}
                      </span>
                      <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded-md font-mono">
                        MP4
                      </span>
                    </div>
                  )}
                </div>

                {/* The Embedded Video Player */}
                {currentVideo ? (
                  <div className="space-y-4">
                    <div
                      className={`relative w-full rounded-2xl bg-black overflow-hidden border border-[#1F2937] shadow-2xl flex items-center justify-center ${
                        currentVideo.aspectRatio === '9:16'
                          ? 'max-w-xs mx-auto aspect-[9/16]'
                          : 'aspect-video'
                      }`}
                    >
                      <video
                        id="veo-video-player"
                        ref={videoPlayerRef}
                        key={currentVideo.id + currentVideo.url}
                        src={currentVideo.url}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-contain"
                      >
                        متصفحك لا يدعم تشغيل الفيديو.
                      </video>
                    </div>

                    {/* Prompt details of active video */}
                    <div className="rounded-xl bg-[#0A0C10] p-3 border border-[#1F2937] text-xs text-slate-300 space-y-1">
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span className="font-bold text-slate-400">وصف الفيديو:</span>
                        <span>{currentVideo.createdAt}</span>
                      </div>
                      <p className="dir-ltr text-left font-mono text-slate-300 line-clamp-2">
                        {currentVideo.prompt}
                      </p>
                    </div>

                    {/* ⬇️ LARGE & PROMINENT DOWNLOAD BUTTON WITH 4 STATES */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                      <button
                        id="download-video-btn"
                        onClick={() => handleDownloadVideo()}
                        disabled={downloadState === 'downloading'}
                        className={`w-full sm:flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base shadow-xl transition-all duration-200 ${
                          downloadState === 'downloading'
                            ? 'bg-amber-600 text-white cursor-wait'
                            : downloadState === 'success'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/30'
                            : downloadState === 'error'
                            ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-900/30'
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/30 hover:scale-[1.01]'
                        }`}
                      >
                        {downloadState === 'downloading' && (
                          <>
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>⏳ جاري التنزيل...</span>
                          </>
                        )}
                        {downloadState === 'success' && (
                          <>
                            <Check className="h-5 w-5" />
                            <span>✓ تم تنزيل الفيديو</span>
                          </>
                        )}
                        {downloadState === 'error' && (
                          <>
                            <AlertCircle className="h-5 w-5" />
                            <span>✕ فشل التنزيل - حاول مرة أخرى</span>
                          </>
                        )}
                        {downloadState === 'idle' && (
                          <>
                            <Download className="h-5 w-5" />
                            <span>⬇️ تنزيل الفيديو</span>
                          </>
                        )}
                      </button>

                      {/* 🔗 SHARE BUTTON */}
                      <button
                        id="share-video-btn"
                        onClick={() => handleShareVideo()}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-bold text-sm bg-[#0A0C10] border border-[#1F2937] text-slate-200 hover:text-white hover:border-blue-500/50 hover:bg-[#1F2937] transition-all shadow-md"
                      >
                        <Share2 className="h-4 w-4 text-blue-400" />
                        <span>🔗 مشاركة الفيديو</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty state placeholder when no video generated yet */
                  <div className="aspect-video w-full rounded-2xl bg-[#0A0C10] border border-[#1F2937] border-dashed flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <span className="p-4 rounded-2xl bg-blue-950/50 border border-blue-800/30 text-blue-400">
                      <Video className="h-8 w-8" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">لا يوجد فيديو معروض حالياً</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        اكتب وصف المشهد واضغط "بدء توليد مقطع Veo 3.1" ليظهر الفيديو في المشغل هنا مع زر التنزيل المباشر.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Previous Generated Videos Gallery */}
          {savedVideos.length > 0 && (
            <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">معرض مقاطع الفيديو المولدة سابقاً</h3>
                </div>
                <span className="text-xs text-slate-500">{savedVideos.length} فيديو</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {savedVideos.map((video) => {
                  const isCurrent = currentVideo?.id === video.id;
                  const isDownloadingThis = downloadingVideoId === video.id && downloadState === 'downloading';

                  return (
                    <div
                      key={video.id}
                      onClick={() => setCurrentVideo(video)}
                      className={`group rounded-xl border p-3 bg-[#0A0C10] transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                        isCurrent
                          ? 'border-blue-500 ring-1 ring-blue-500/30 shadow-lg'
                          : 'border-[#1F2937] hover:border-slate-700'
                      }`}
                    >
                      {/* Video Thumbnail / Preview */}
                      <div className="relative aspect-video rounded-lg bg-black overflow-hidden border border-[#1F2937] flex items-center justify-center">
                        <video
                          src={video.url}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex items-center justify-center">
                          <span className="h-8 w-8 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                          </span>
                        </div>
                        <div className="absolute top-1.5 left-1.5 flex gap-1">
                          <span className="text-[9px] bg-black/70 backdrop-blur text-blue-300 px-1.5 py-0.5 rounded font-mono">
                            {video.aspectRatio}
                          </span>
                        </div>
                      </div>

                      {/* Prompt & Meta */}
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {video.prompt}
                      </p>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#1F2937]/60">
                        <span className="text-[10px] text-slate-500">{video.createdAt}</span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadVideo(video);
                            }}
                            disabled={isDownloadingThis}
                            className="p-1.5 rounded-lg bg-[#11141B] hover:bg-blue-600 text-slate-300 hover:text-white border border-[#1F2937] transition"
                            title="تنزيل الفيديو"
                          >
                            {isDownloadingThis ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareVideo(video);
                            }}
                            className="p-1.5 rounded-lg bg-[#11141B] hover:bg-[#1F2937] text-slate-300 hover:text-white border border-[#1F2937] transition"
                            title="مشاركة"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteVideo(video.id, e)}
                            className="p-1.5 rounded-lg bg-[#11141B] hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 border border-[#1F2937] transition"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
