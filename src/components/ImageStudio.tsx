import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Wand2,
  Download,
  Copy,
  Check,
  Maximize2,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Sliders,
  UploadCloud,
  X,
  Share2,
  Eye,
  Info,
} from 'lucide-react';
import { AspectRatio, GeneratedImage, ImageStyle } from '../types';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';
import { downloadImageFile, shareImage } from '../utils/imageUtils';

interface ImageStudioProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState<ImageStyle>('realistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(() =>
    storageService.getImages()
  );
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [previewModalImg, setPreviewModalImg] = useState<GeneratedImage | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [enhancedData, setEnhancedData] = useState<{
    enhancedArabic?: string;
    enhancedEnglish?: string;
    recommendedSettings?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Sync initial prompt from template if passed
  React.useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  const styleOptions: { id: ImageStyle; label: string; desc: string; icon: string }[] = [
    {
      id: 'realistic',
      label: 'واقعي وسينمائي',
      desc: 'إضاءة طبيعية وتفاصيل فائقة الدقة 8K',
      icon: '📸',
    },
    {
      id: 'islamic_art',
      label: 'فن وزخرفة إسلامية',
      desc: 'أشكال هندسية أرابيسك وخط عربي فاخر',
      icon: '🕌',
    },
    {
      id: 'digital_art',
      label: 'رسم رقمي ومفاهيمي',
      desc: 'ألوان ساطعة وإضاءة خيالية درامية',
      icon: '🎨',
    },
    {
      id: 'three_d',
      label: 'ثلاثي الأبعاد 3D',
      desc: 'تجسيم متقن ومؤثرات Octane Render',
      icon: '🧊',
    },
    {
      id: 'anime',
      label: 'أنمي سينمائي',
      desc: 'أسلوب استوديو الرسوم المتحركة اليابانية',
      icon: '✨',
    },
    {
      id: 'logo',
      label: 'تصميم شعار وفيكتور',
      desc: 'أيقونات وشعارات علامة تجارية مسطحة',
      icon: '💠',
    },
  ];

  const aspectOptions: { id: AspectRatio; label: string; ratio: string }[] = [
    { id: '1:1', label: 'مربع (1:1)', ratio: 'انستقرام وشخصي' },
    { id: '16:9', label: 'عريض (16:9)', ratio: 'يوتيوب وشاشات' },
    { id: '9:16', label: 'طولي (9:16)', ratio: 'ستوري وتيك توك' },
    { id: '4:3', label: 'كلاسيكي (4:3)', ratio: 'تصوير قياسي' },
    { id: '3:4', label: 'عمودي (3:4)', ratio: 'ملصقات ومجلات' },
  ];

  // Prompt Enhancer
  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const data = await apiService.enhancePrompt(prompt, 'image');
      setEnhancedData(data);
      if (data.enhancedArabic) {
        setPrompt(data.enhancedArabic);
      }
    } catch (err) {
      console.error('Enhance prompt error:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Upload image for image-to-image editing
  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Generate Image
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const result = await apiService.generateImage(prompt, aspectRatio, style, sourceImage);

      if (result.success && result.imageUrl) {
        const newImg: GeneratedImage = {
          id: `img-${Date.now()}`,
          url: result.imageUrl,
          prompt,
          enhancedPrompt: result.prompt,
          style,
          aspectRatio,
          createdAt: new Date().toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          description: result.description,
        };

        setCurrentImage(newImg);
        setGeneratedImages((prev) => [newImg, ...prev]);
        storageService.saveImage(newImg);
        showToast('✓ تم توليد الصورة بنجاح وحفظها');
      } else {
        showToast(`⚠️ ${result.message || result.description || 'لم يتم استرجاع الصورة من النموذج.'}`);
      }
    } catch (err: any) {
      showToast(`⚠️ حدث خطأ أثناء إنشاء الصورة: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download image
  const handleDownload = async (imgUrl: string, promptText?: string) => {
    try {
      showToast('⏳ جاري تنزيل الصورة...');
      await downloadImageFile(imgUrl, `Nebras_AI_${Date.now()}.png`);
      showToast('✓ تم تنزيل الصورة بنجاح');
    } catch (err: any) {
      console.error('Download image error:', err);
      showToast('⚠️ فشل تنزيل الصورة');
    }
  };

  // Share image
  const handleShare = async (imgUrl: string, promptText?: string) => {
    try {
      const res = await shareImage(imgUrl, 'صورة بالذكاء الاصطناعي', promptText);
      showToast(res.message);
    } catch (err: any) {
      showToast('⚠️ تعذر إتمام المشاركة');
    }
  };

  // Copy prompt
  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    showToast('✓ تم نسخ البرومبت');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div id="image-studio-container" className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-4 space-y-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#11141B]/95 text-blue-300 border border-blue-500/40 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Intro */}
      <div className="rounded-2xl bg-[#11141B] p-5 border border-[#1F2937] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-bold text-white">استوديو توليد وتعديل الصور الفنية</h2>
          </div>
          <p className="text-sm text-slate-300">
            حوّل أفكارك وخيالاتك باللغة العربية إلى لوحات بصرية وصور فوتوغرافية وتصاميم ثلاثية الأبعاد بدقة استثنائية.
          </p>
        </div>

        {sourceImage && (
          <div className="flex items-center gap-2.5 bg-[#1F2937]/70 px-3 py-1.5 rounded-xl border border-[#1F2937]">
            <img src={sourceImage} alt="Source" className="h-9 w-9 rounded-lg object-cover" />
            <div className="text-xs">
              <p className="text-blue-400 font-medium">وضع تعديل الصورة</p>
              <button
                onClick={() => setSourceImage(null)}
                className="text-red-400 hover:underline"
              >
                إلغاء الصورة المرفقة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Controls & Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Prompt Input Box */}
          <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <span>وصف الصورة (البرومبت)</span>
                <span className="text-blue-400 font-normal text-xs">(عربي أو إنجليزي)</span>
              </label>

              {/* Enhance Prompt Button */}
              <button
                onClick={handleEnhancePrompt}
                disabled={!prompt.trim() || isEnhancing}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-800/40 transition-all disabled:opacity-50"
                title="ترقية الوصف وإضافة تفاصيل سينمائية مبهرة"
              >
                {isEnhancing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                <span>تحسين البرومبت ذكياً</span>
              </button>
            </div>

            <textarea
              id="image-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: واحة ساحرة في قلب صحراء مستقبلية ذات أبراج زجاجية، وقت الغروب الذهبي مع انعكاسات ضوئية سينمائية فائقة الدقة..."
              rows={3}
              className="w-full resize-none rounded-xl bg-[#0A0C10] border border-[#1F2937] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />

            {/* If enhanced data is available */}
            {enhancedData && (
              <div className="rounded-xl bg-[#0A0C10]/80 border border-blue-500/20 p-3 text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center justify-between text-blue-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> البرومبت المطوّر بالإنجليزية:
                  </span>
                  <button
                    onClick={() => {
                      if (enhancedData.enhancedEnglish) setPrompt(enhancedData.enhancedEnglish);
                    }}
                    className="text-[11px] underline hover:text-blue-300"
                  >
                    استخدام هذا البرومبت
                  </button>
                </div>
                <p className="font-mono text-[11px] text-slate-400 leading-relaxed text-left dir-ltr">
                  {enhancedData.enhancedEnglish}
                </p>
              </div>
            )}

            {/* Image-to-image attachment trigger */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleSourceUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200"
              >
                <UploadCloud className="h-4 w-4 text-blue-400" />
                <span>{sourceImage ? 'تغيير الصورة المرجعية' : 'إرفاق صورة لتعديلها (Image-to-Image)'}</span>
              </button>

              {sourceImage && (
                <span className="text-blue-400 text-[11px]">مرفق صورة للتعديل ✓</span>
              )}
            </div>
          </div>

          {/* Style Selector */}
          <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 shadow-lg space-y-3">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-400" />
              <span>النمط الفني والأسلوب</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {styleOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setStyle(opt.id)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-right transition-all ${
                    style === opt.id
                      ? 'bg-[#1F2937] border-blue-500 text-blue-400 shadow-sm ring-1 ring-blue-500/20 font-semibold'
                      : 'bg-[#0A0C10] border-[#1F2937] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xl mb-1">{opt.icon}</span>
                  <span className="text-xs font-bold text-slate-100">{opt.label}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 shadow-lg space-y-3">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-blue-400" />
              <span>أبعاد ونسب الصورة (Aspect Ratio)</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {aspectOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAspectRatio(opt.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    aspectRatio === opt.id
                      ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-md shadow-blue-600/20'
                      : 'bg-[#0A0C10] border-[#1F2937] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] opacity-75">{opt.ratio}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            id="generate-image-btn"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 p-4 text-base font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>جاري رسم وتوليد اللوحة بالذكاء الاصطناعي...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>إنشاء الصورة الآن</span>
              </>
            )}
          </button>
        </div>

        {/* Output & Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 shadow-lg flex flex-col h-full min-h-[420px]">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center justify-between">
              <span>المعاينة المباشرة</span>
              {currentImage && (
                <span className="text-xs font-normal text-blue-400">
                  {currentImage.createdAt}
                </span>
              )}
            </h3>

            {/* Image Canvas Box */}
            <div className="relative flex-1 flex items-center justify-center rounded-xl bg-[#0A0C10] border border-[#1F2937] overflow-hidden min-h-[300px]">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <Sparkles className="h-6 w-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    جاري التوليد الفني للوحة...
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    يقوم النموذج بمحاكاة الضوء والظلال والأنماط الهندسية بدقة عالية.
                  </p>
                </div>
              ) : currentImage ? (
                <div className="relative w-full h-full flex items-center justify-center group">
                  <img
                    src={currentImage.url}
                    alt={currentImage.prompt}
                    className="max-h-[380px] w-auto max-w-full object-contain rounded-lg"
                  />
                  {/* Hover overlay actions */}
                  <div className="absolute inset-0 bg-[#0A0C10]/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => setPreviewModalImg(currentImage)}
                      className="p-3 rounded-full bg-[#11141B] text-white hover:bg-blue-600 transition border border-[#1F2937]"
                      title="تكبير ومعاينة"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(currentImage.url, currentImage.prompt)}
                      className="p-3 rounded-full bg-[#11141B] text-white hover:bg-blue-600 transition border border-[#1F2937]"
                      title="تحميل الصورة"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500 p-6 text-center">
                  <ImageIcon className="h-12 w-12 text-slate-700 stroke-1" />
                  <p className="text-sm font-medium">لم يتم إنشاء صور بعد</p>
                  <p className="text-xs max-w-xs">
                    اكتب وصفك في الحقل واضغط على "إنشاء الصورة" لترى النتيجة البصرية هنا.
                  </p>
                </div>
              )}
            </div>

            {/* Current Image Details & Actions */}
            {currentImage && (
              <div className="mt-3 pt-3 border-t border-[#1F2937] space-y-2">
                <p className="text-xs text-slate-300 line-clamp-2">
                  <span className="text-blue-400 font-bold">البرومبت: </span>
                  {currentImage.prompt}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(currentImage.url, currentImage.prompt)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-[#1F2937] hover:bg-slate-700 px-3 py-1.5 rounded-lg transition"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-400" />
                      <span>تحميل PNG</span>
                    </button>
                    <button
                      onClick={() => handleShare(currentImage.url, currentImage.prompt)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-[#1F2937] hover:bg-slate-700 px-3 py-1.5 rounded-lg transition"
                    >
                      <Share2 className="h-3.5 w-3.5 text-blue-400" />
                      <span>مشاركة</span>
                    </button>
                    <button
                      onClick={() => handleCopyPrompt(currentImage.prompt)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-[#1F2937] hover:bg-slate-700 px-3 py-1.5 rounded-lg transition"
                    >
                      {copiedPrompt ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>نسخ البرومبت</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setSourceImage(currentImage.url)}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    تعديل هذه الصورة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Generations Strip */}
      {generatedImages.length > 0 && (
        <div className="rounded-2xl bg-[#11141B] border border-[#1F2937] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">الصور السابقة في جلستك</h3>
            <span className="text-xs text-slate-500">{generatedImages.length} صورة محفوظة</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {generatedImages.map((img) => (
              <div
                key={img.id}
                onClick={() => setCurrentImage(img)}
                className={`relative shrink-0 w-28 h-28 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                  currentImage?.id === img.id
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-[#1F2937] hover:border-slate-600'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.prompt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 bg-[#0A0C10]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-[#11141B] border border-[#1F2937] rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <h4 className="text-sm font-bold text-white">معاينة الصورة بدقة كاملة</h4>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1F2937]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-center max-h-[70vh] overflow-hidden rounded-xl bg-[#0A0C10]">
              <img
                src={previewModalImg.url}
                alt={previewModalImg.prompt}
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <p className="max-w-lg truncate">{previewModalImg.prompt}</p>
              <button
                onClick={() => handleDownload(previewModalImg.url, previewModalImg.prompt)}
                className="flex items-center gap-1.5 bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition"
              >
                <Download className="h-4 w-4" />
                <span>تحميل الصورة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
