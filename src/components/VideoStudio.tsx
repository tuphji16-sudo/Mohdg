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
  Sliders,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { VideoStoryboard, VideoScene, VeoGenerationJob } from '../types';
import { apiService } from '../services/api';
import { SpeechHelper } from '../services/speech';
import { storageService } from '../services/storage';

interface VideoStudioProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

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
  const [veoOperationName, setVeoOperationName] = useState<string | null>(null);
  const [veoStatusMessage, setVeoStatusMessage] = useState<string>('');

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
    setVeoStatusMessage('جاري إرسال طلب الفيديو إلى محرك Veo 3.1...');

    try {
      const res = await apiService.generateVeoVideo(veoPrompt, veoAspectRatio, veoResolution);
      if (res.success && res.operationName) {
        setVeoOperationName(res.operationName);
        setVeoStatusMessage('العملية قيد المعالجة (تستغرق عادة دقيقة إلى دقيقتين)...');

        // Poll for status
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await apiService.checkVideoStatus(res.operationName);
            if (statusRes.done) {
              clearInterval(pollInterval);
              setIsGeneratingVeo(false);
              setVeoStatusMessage('اكتملت معالجة الفيديو بنجاح! 🎉');
            } else {
              setVeoStatusMessage('جاري محاكاة الريندر وتحريك الإطارات البصرية...');
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }, 8000);
      }
    } catch (err: any) {
      setIsGeneratingVeo(false);
      setVeoStatusMessage(`خطأ: ${err.message}`);
    }
  };

  const currentScene: VideoScene | undefined = storyboard?.scenes?.[currentSceneIndex];

  return (
    <div id="video-studio-container" className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-4 space-y-6">
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
            ابتكر سيناريوهات فيديو سينمائية وقصصاً مصورة متكاملة مع توجيهات الكاميرا والتعليق الصوتي والبرومبتات الخاصة بنماذج الفيديو.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-[#0A0C10] p-1 border border-[#1F2937] self-start sm:self-auto">
          <button
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
            onClick={() => setActiveSubTab('veo_generator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'veo_generator'
                ? 'bg-[#1F2937] text-blue-400 border border-blue-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>توليد مقاطع Veo</span>
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
                  placeholder="اكتب فكرة الفيديو، مثلاً: إعلان سينمائي لتطبيق رقمي يربط بين الحرفيين والزبائن في العالم العربي، أو فيلم وثائقي عن حضارة الأندلس..."
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
        /* Veo Video Generator Tab */
        <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-5 shadow-xl space-y-5">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">توليد مقاطع الفيديو بنموذج Veo 3.1</h3>
          </div>
          <p className="text-xs text-slate-400">
            أدخل برومبت المشهد المرئي لتوليد فيديو احترافي مباشر بدقة 720p أو 1080p.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                وصف الفيديو بالإنجليزية (Veo Prompt)
              </label>
              <textarea
                value={veoPrompt}
                onChange={(e) => setVeoPrompt(e.target.value)}
                placeholder="A cinematic drone shot flying over ancient sand dunes with glowing golden lanterns at twilight, 4k ultra-realistic..."
                rows={3}
                className="w-full resize-none rounded-xl bg-[#0A0C10] border border-[#1F2937] p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none dir-ltr text-left font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">أبعاد الفيديو</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVeoAspectRatio('16:9')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      veoAspectRatio === '16:9'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-[#0A0C10] border-[#1F2937] text-slate-300'
                    }`}
                  >
                    16:9 (عريض سينمائي)
                  </button>
                  <button
                    onClick={() => setVeoAspectRatio('9:16')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      veoAspectRatio === '9:16'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-[#0A0C10] border-[#1F2937] text-slate-300'
                    }`}
                  >
                    9:16 (طولي ريلز وستوري)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">الدقة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVeoResolution('720p')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      veoResolution === '720p'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-[#0A0C10] border-[#1F2937] text-slate-300'
                    }`}
                  >
                    720p HD (سريع)
                  </button>
                  <button
                    onClick={() => setVeoResolution('1080p')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      veoResolution === '1080p'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                        : 'bg-[#0A0C10] border-[#1F2937] text-slate-300'
                    }`}
                  >
                    1080p Full HD
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateVeo}
              disabled={!veoPrompt.trim() || isGeneratingVeo}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGeneratingVeo ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جاري معالجة الفيديو...</span>
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  <span>بدء توليد الفيديو بواسطة Veo</span>
                </>
              )}
            </button>

            {/* Status Feedback */}
            {veoStatusMessage && (
              <div className="rounded-xl bg-[#0A0C10] p-4 border border-blue-500/20 text-xs text-slate-300 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
                <p>{veoStatusMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
