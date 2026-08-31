import React, { useState } from 'react';
import {
  Volume2,
  Mic,
  Sparkles,
  Play,
  Pause,
  Download,
  Languages,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  FileText,
  Wand2,
} from 'lucide-react';
import { AudioItem } from '../types';
import { apiService } from '../services/api';
import { SpeechHelper } from '../services/speech';
import { storageService } from '../services/storage';

export const AudioVoiceStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tts' | 'proofread' | 'translate'>('tts');

  // TTS State
  const [ttsText, setTtsText] = useState(
    'مرحباً بكم في عصر الذكاء الاصطناعي الشامل، حيث يلتقي الإبداع بالدقة اللغوية الفائقة.'
  );
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [savedAudios, setSavedAudios] = useState<AudioItem[]>(() => storageService.getAudios());
  const [currentAudio, setCurrentAudio] = useState<AudioItem | null>(null);

  // Proofreading / Rhetoric refinement state
  const [draftText, setDraftText] = useState('');
  const [refinedResult, setRefinedResult] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineTone, setRefineTone] = useState('فصيح بليغ');

  // Translation state
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('العربية الفصحى');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const voiceOptions = [
    { id: 'Kore', name: 'كوري (Kore)', desc: 'صوت نسائي دافئ وطبيعي', gender: 'أنثوي' },
    { id: 'Puck', name: 'باك (Puck)', desc: 'صوت شبابي مشرق وحيوي', gender: 'رجالي' },
    { id: 'Fenrir', name: 'فينرير (Fenrir)', desc: 'صوت رخيم عميق وواثق', gender: 'رجالي' },
    { id: 'Zephyr', name: 'زفير (Zephyr)', desc: 'صوت هادئ ورزين ومتزن', gender: 'محايد' },
    { id: 'Charon', name: 'شارون (Charon)', desc: 'صوت وثائقي وإخباري رصين', gender: 'رجالي' },
  ];

  // Handle TTS Generation
  const handleGenerateTTS = async () => {
    if (!ttsText.trim() || isGeneratingTTS) return;
    setIsGeneratingTTS(true);
    SpeechHelper.stopSpeaking();

    try {
      // First try browser native speech for fast preview
      const success = SpeechHelper.speakArabic(
        ttsText,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false)
      );

      // Also call backend TTS for high-fidelity base64 audio storage
      const res = await apiService.generateTTS(ttsText, selectedVoice);
      if (res.success && res.audioBase64) {
        const item: AudioItem = {
          id: `audio-${Date.now()}`,
          text: ttsText,
          audioBase64: res.audioBase64,
          voice: selectedVoice,
          createdAt: new Date().toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setCurrentAudio(item);
        setSavedAudios((prev) => [item, ...prev]);
        storageService.saveAudio(item);
      }
    } catch (e: any) {
      console.warn('TTS API warning:', e);
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  const handlePlaySaved = (item: AudioItem) => {
    if (item.audioBase64) {
      setIsPlayingAudio(true);
      SpeechHelper.playBase64Audio(item.audioBase64, 'audio/wav', () =>
        setIsPlayingAudio(false)
      );
    } else {
      SpeechHelper.speakArabic(
        item.text,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false)
      );
    }
  };

  const handleStopAudio = () => {
    SpeechHelper.stopSpeaking();
    setIsPlayingAudio(false);
  };

  // Proofreading / Rhetoric
  const handleRefineText = async () => {
    if (!draftText.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const prompt = `أنت خبير ومدقق لغوي وبلاغي باللغة العربية الفصحى.
المطلوب تدقيق النص التالي وتحسين صياغته وبلاغته بأسلوب: ${refineTone}.
قم بتصحيح أي أخطاء إملائية ونحوية وركاكة، وأعد صياغته ليكون فصيحاً ومؤثراً، ثم اذكر باختصار أبرز التحسينات التي قمت بها.

النص المراد تدقيقه:
${draftText}`;

      let result = '';
      await apiService.streamChat(
        [{ id: '1', role: 'user', content: prompt, timestamp: '' }],
        'balanced',
        false,
        [],
        {
          onChunk: (chunk) => {
            result += chunk;
            setRefinedResult(result);
          },
          onDone: () => setIsRefining(false),
          onError: (err) => {
            alert(err);
            setIsRefining(false);
          },
        }
      );
    } catch (err: any) {
      alert(err.message);
      setIsRefining(false);
    }
  };

  // Translation
  const handleTranslate = async () => {
    if (!sourceText.trim() || isTranslating) return;
    setIsTranslating(true);
    try {
      const prompt = `ترجم النص التالي بدقة فائقة إلى: ${targetLang} مع مراعاة السياق الثقافي والأسلوب الفصيح الخالي من الترجمة الحرفية الركيكة:

${sourceText}`;

      let result = '';
      await apiService.streamChat(
        [{ id: '1', role: 'user', content: prompt, timestamp: '' }],
        'balanced',
        false,
        [],
        {
          onChunk: (chunk) => {
            result += chunk;
            setTranslatedText(result);
          },
          onDone: () => setIsTranslating(false),
          onError: (err) => {
            alert(err);
            setIsTranslating(false);
          },
        }
      );
    } catch (err: any) {
      alert(err.message);
      setIsTranslating(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div id="audio-voice-studio" className="max-w-5xl mx-auto w-full px-2 sm:px-4 py-4 space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-[#11141B] p-5 border border-[#1F2937] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/30">
              <Volume2 className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-bold text-white">استوديو الصوت والفصاحة اللغوية</h2>
          </div>
          <p className="text-sm text-slate-300">
            تحويل النصوص إلى أصوات طبيعية، التدقيق اللغوي والبلاغي، والترجمة المعربة بدقة.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[#0A0C10] p-1 rounded-xl border border-[#1F2937] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('tts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tts'
                ? 'bg-[#1F2937] text-blue-400 border border-blue-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            نطق صوتي (TTS)
          </button>
          <button
            onClick={() => setActiveTab('proofread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'proofread'
                ? 'bg-[#1F2937] text-blue-400 border border-blue-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            تدقيق وبلاغة
          </button>
          <button
            onClick={() => setActiveTab('translate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'translate'
                ? 'bg-[#1F2937] text-blue-400 border border-blue-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ترجمة وتعريب
          </button>
        </div>
      </div>

      {activeTab === 'tts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 shadow-md space-y-3">
              <label className="text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>النص المراد نطقه صوتياً</span>
                <span className="text-xs text-slate-400 font-normal">{ttsText.length} حرف</span>
              </label>

              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="اكتب النص العربي هنا للاستماع إليه بنبرة صوتية طبيعية..."
                rows={4}
                className="w-full resize-none rounded-xl bg-[#0A0C10] border border-[#1F2937] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Voice selection */}
            <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 shadow-md space-y-3">
              <label className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-400" />
                <span>اختر النبرة والصوت</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {voiceOptions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-3 rounded-xl border text-right transition-all flex items-start justify-between ${
                      selectedVoice === v.id
                        ? 'bg-blue-600/15 border-blue-500 text-white'
                        : 'bg-[#0A0C10] border-[#1F2937] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100">{v.name}</div>
                      <div className="text-[11px] text-slate-400">{v.desc}</div>
                    </div>
                    <span className="text-[10px] bg-[#1F2937] px-2 py-0.5 rounded text-blue-400 font-medium">
                      {v.gender}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateTTS}
                disabled={!ttsText.trim() || isGeneratingTTS}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 transition-all"
              >
                {isGeneratingTTS ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري التوليد والنطق...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    <span>قراءة النص صوتياً</span>
                  </>
                )}
              </button>

              {isPlayingAudio && (
                <button
                  onClick={handleStopAudio}
                  className="px-4 py-3.5 rounded-xl bg-red-500/20 border border-red-500 text-red-400 font-bold text-sm hover:bg-red-500/30 transition"
                >
                  إيقاف الصوت
                </button>
              )}
            </div>
          </div>

          {/* Saved Audio Library (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 shadow-md space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>المقاطع الصوتية الأخيرة</span>
                <span className="text-xs text-slate-500">{savedAudios.length} مقطع</span>
              </h3>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {savedAudios.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    لا توجد مقاطع صوتية بعد. اكتب نصاً واضغط على قراءة النص.
                  </p>
                ) : (
                  savedAudios.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#0A0C10] border border-[#1F2937] space-y-2"
                    >
                      <p className="text-xs text-slate-300 line-clamp-2">{item.text}</p>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-[#1F2937]">
                        <span>{item.voice} • {item.createdAt}</span>
                        <button
                          onClick={() => handlePlaySaved(item)}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>تشغيل</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'proofread' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input draft */}
            <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-200">النص الأصلي (المسودة)</label>
                <select
                  value={refineTone}
                  onChange={(e) => setRefineTone(e.target.value)}
                  className="rounded-lg bg-[#0A0C10] border border-[#1F2937] px-2.5 py-1 text-xs text-blue-400 focus:outline-none"
                >
                  <option value="فصيح وبليغ">أسلوب فصيح وبليغ</option>
                  <option value="رسمي واحترافي للأعمال">رسمي واحترافي للأعمال</option>
                  <option value="تسويقي جذاب">تسويقي جذاب</option>
                  <option value="أكاديمي وبحثي">أكاديمي وبحثي</option>
                </select>
              </div>

              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="ألصق النص العربي هنا لتدقيقه إملائياً ونحوياً وتطوير صياغته البلاغية..."
                rows={8}
                className="w-full resize-none rounded-xl bg-[#0A0C10] border border-[#1F2937] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />

              <button
                onClick={handleRefineText}
                disabled={!draftText.trim() || isRefining}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 text-sm font-bold text-white hover:bg-blue-500 shadow-md shadow-blue-600/20 disabled:opacity-50 transition"
              >
                {isRefining ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري التدقيق والتحسين البلاغي...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    <span>تدقيق وتحسين الصياغة</span>
                  </>
                )}
              </button>
            </div>

            {/* Refined output */}
            <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>النتيجة المدققة والمحسنة</span>
                </span>
                {refinedResult && (
                  <button
                    onClick={() => handleCopy('refined', refinedResult)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                  >
                    {copiedKey === 'refined' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>نسخ</span>
                  </button>
                )}
              </div>

              <div className="flex-1 rounded-xl bg-[#0A0C10] p-3 border border-[#1F2937] text-sm text-slate-100 whitespace-pre-wrap overflow-y-auto max-h-[300px] leading-relaxed">
                {refinedResult || (
                  <span className="text-slate-500 text-xs">
                    ستظهر الصياغة الفصيحة والملاحظات البلاغية هنا بعد الضغط على تدقيق وتحسين.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'translate' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-200">النص المصدر</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="rounded-lg bg-[#0A0C10] border border-[#1F2937] px-2.5 py-1 text-xs text-blue-400 focus:outline-none"
                >
                  <option value="العربية الفصحى المشرقة">إلى: العربية الفصحى</option>
                  <option value="الإنجليزية الاحترافية (English)">إلى: English</option>
                  <option value="الفرنسية الأنيقة (Français)">إلى: Français</option>
                </select>
              </div>

              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="اكتب أو الصق النص المراد تعريبه وترجمته بأسلوب احترافي..."
                rows={8}
                className="w-full resize-none rounded-xl bg-[#0A0C10] border border-[#1F2937] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />

              <button
                onClick={handleTranslate}
                disabled={!sourceText.trim() || isTranslating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 text-sm font-bold text-white hover:bg-blue-500 shadow-md shadow-blue-600/20 disabled:opacity-50 transition"
              >
                {isTranslating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري الترجمة والتعريب...</span>
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4" />
                    <span>بدء الترجمة الذكية</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <span className="text-sm font-bold text-slate-200">الترجمة المصاغة</span>
                {translatedText && (
                  <button
                    onClick={() => handleCopy('trans', translatedText)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                  >
                    {copiedKey === 'trans' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>نسخ</span>
                  </button>
                )}
              </div>

              <div className="flex-1 rounded-xl bg-[#0A0C10] p-3 border border-[#1F2937] text-sm text-slate-100 whitespace-pre-wrap overflow-y-auto max-h-[300px] leading-relaxed">
                {translatedText || (
                  <span className="text-slate-500 text-xs">
                    ستظهر الترجمة الدقيقة والمعربة هنا.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
