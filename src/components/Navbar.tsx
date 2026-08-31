import React from 'react';
import {
  MessageSquare,
  Image as ImageIcon,
  Film,
  Volume2,
  Bookmark,
  Sparkles,
  LayoutGrid,
  Zap,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenTemplates: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTemplates,
}) => {
  const tabs = [
    {
      id: 'chat' as ActiveTab,
      label: 'الردود والمحادثة',
      icon: MessageSquare,
      badge: 'Gemini 3.7',
    },
    {
      id: 'image' as ActiveTab,
      label: 'استوديو الصور',
      icon: ImageIcon,
      badge: 'توليد وتعديل',
    },
    {
      id: 'video' as ActiveTab,
      label: 'الفيديو والسيناريو',
      icon: Film,
      badge: 'Veo & Storyboard',
    },
    {
      id: 'audio' as ActiveTab,
      label: 'الصوت واللغة',
      icon: Volume2,
      badge: 'فصاحة ونطق',
    },
    {
      id: 'gallery' as ActiveTab,
      label: 'المعرض والمحفوظات',
      icon: Bookmark,
    },
  ];

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-40 w-full border-b border-[#1F2937] bg-[#0A0C10]/80 backdrop-blur-md px-4 lg:px-8 py-3"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-900/20 ring-1 ring-blue-400/30 font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                نظام نبراس الذكي
              </h1>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 ring-1 ring-blue-500/30">
                PRO
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              المنصة الشاملة للمحادثة التوليدية، الصور، الفيديو، والصوت
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-[#11141B] p-1.5 border border-[#1F2937]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1F2937] text-blue-400 shadow-sm font-semibold ring-1 ring-blue-500/20'
                    : 'text-slate-400 hover:bg-[#1F2937]/50 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all ${
                    isActive ? 'bg-blue-500' : 'bg-slate-600'
                  }`}
                />
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`hidden xl:inline-block rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                      isActive
                        ? 'bg-blue-950/60 text-blue-400 border border-blue-800/40 font-bold'
                        : 'bg-[#0A0C10] text-slate-500 border border-[#1F2937]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            id="open-templates-btn"
            onClick={onOpenTemplates}
            className="flex items-center gap-2 rounded-xl bg-[#11141B] px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-200 border border-[#1F2937] hover:bg-[#1F2937] hover:border-slate-600 transition-all shadow-sm"
          >
            <LayoutGrid className="h-4 w-4 text-blue-400" />
            <span className="hidden md:inline">مكتبة النماذج</span>
            <span className="md:hidden">النماذج</span>
          </button>
        </div>
      </div>
    </header>
  );
};
