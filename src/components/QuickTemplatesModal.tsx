import React, { useState } from 'react';
import {
  X,
  Sparkles,
  LayoutGrid,
  Megaphone,
  Image as ImageIcon,
  Film,
  Code2,
  Feather,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { PROMPT_TEMPLATES } from '../data/templates';
import { ActiveTab, PromptTemplate } from '../types';

interface QuickTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: PromptTemplate) => void;
}

export const QuickTemplatesModal: React.FC<QuickTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  if (!isOpen) return null;

  const categories = [
    'الكل',
    'كتابة وتسويق',
    'توليد صور',
    'فيديو وسيناريو',
    'برمجة وتطوير',
    'تعليم وبحث',
    'فنون وأدب',
  ];

  const filteredTemplates =
    selectedCategory === 'الكل'
      ? PROMPT_TEMPLATES
      : PROMPT_TEMPLATES.filter((t) => t.category === selectedCategory);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Megaphone':
        return <Megaphone className="h-5 w-5 text-amber-400" />;
      case 'Image':
        return <ImageIcon className="h-5 w-5 text-sky-400" />;
      case 'Film':
        return <Film className="h-5 w-5 text-purple-400" />;
      case 'Code2':
        return <Code2 className="h-5 w-5 text-emerald-400" />;
      case 'Feather':
        return <Feather className="h-5 w-5 text-amber-400" />;
      case 'BookOpen':
        return <BookOpen className="h-5 w-5 text-indigo-400" />;
      default:
        return <Sparkles className="h-5 w-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0C10]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#11141B] border border-[#1F2937] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/30">
              <LayoutGrid className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">مكتبة القوالب والأفكار الجاهزة</h3>
              <p className="text-xs text-slate-400">
                نماذج وأفكار ملهمة جاهزة للاستخدام المباشر في الردود أو الصور أو الفيديو.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1F2937] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                  : 'bg-[#0A0C10] border border-[#1F2937] text-slate-300 hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 pr-1 py-1">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => {
                onSelectTemplate(template);
                onClose();
              }}
              className="group flex flex-col justify-between p-4 rounded-2xl bg-[#0A0C10] border border-[#1F2937] hover:border-blue-500/50 hover:bg-[#11141B] transition-all cursor-pointer shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-[#11141B] border border-[#1F2937] group-hover:scale-105 transition">
                      {getIcon(template.iconName)}
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition">
                      {template.title}
                    </h4>
                  </div>
                  <span className="text-[10px] bg-[#11141B] text-slate-400 border border-[#1F2937] px-2 py-0.5 rounded-md">
                    {template.category}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {template.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#1F2937] flex items-center justify-between text-xs text-blue-400 group-hover:text-blue-300 font-semibold">
                <span>تطبيق القالب في قسم {template.targetTab === 'chat' ? 'المحادثة' : template.targetTab === 'image' ? 'الصور' : 'الفيديو'}</span>
                <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
