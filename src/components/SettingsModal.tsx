import React, { useState, useEffect } from 'react';
import { Key, Server, CheckCircle2, AlertTriangle, ShieldCheck, X, Sparkles, RefreshCw } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey, getStoredServerUrl, setStoredServerUrl, testGeminiConnection } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey() || '');
      setServerUrl(getStoredServerUrl() || '');
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredApiKey(apiKey.trim());
    setStoredServerUrl(serverUrl.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiConnection(apiKey.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'فشل الاتصال بمزود الذكاء الاصطناعي',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl border border-[#1F2937] bg-[#0E121A] p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">إعدادات الاتصال والذكاء الاصطناعي</h2>
              <p className="text-xs text-slate-400">ضبط مفتاح Gemini API وعنوان الخادم للتشغيل المباشر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1F2937] hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          {/* Gemini API Key */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                مفتاح Google Gemini API:
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-400 hover:underline"
              >
                الحصول على مفتاح مجاني ↗
              </a>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl border border-[#1F2937] bg-[#161B26] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يُستخدم المفتاح لإرسال طلبات المحادثة والصور والفيديو مباشرة في تطبيق أندرويد بدون أي قيود اتصال.
            </p>
          </div>

          {/* Backend Server URL (Optional) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-blue-400" />
              عنوان الخادم المخصص (اختياري):
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://your-server-domain.com"
              className="w-full rounded-xl border border-[#1F2937] bg-[#161B26] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono"
            />
          </div>

          {/* Connection Test Status */}
          {testResult && (
            <div
              className={`flex items-start gap-2.5 rounded-xl p-3 text-xs leading-relaxed border ${
                testResult.success
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                  : 'border-red-500/30 bg-red-950/20 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>تم حفظ الإعدادات بنجاح!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-[#1F2937] pt-4">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-2 rounded-xl border border-[#1F2937] bg-[#161B26] px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-[#1F2937] transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin text-blue-400' : ''}`} />
            <span>{isTesting ? 'جاري الاختبار...' : 'اختبار الاتصال'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:bg-[#1F2937] hover:text-white transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 transition"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
