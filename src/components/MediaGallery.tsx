import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Image as ImageIcon,
  MessageSquare,
  Film,
  Volume2,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  Maximize2,
  X,
  Sparkles,
} from 'lucide-react';
import { storageService } from '../services/storage';
import { Conversation, GeneratedImage, VideoStoryboard, AudioItem } from '../types';

export const MediaGallery: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'images' | 'storyboards' | 'conversations' | 'audios'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [storyboards, setStoryboards] = useState<VideoStoryboard[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = () => {
    setImages(storageService.getImages());
    setStoryboards(storageService.getStoryboards());
    setConversations(storageService.getConversations());
    setAudios(storageService.getAudios());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteImage = (id: string) => {
    storageService.deleteImage(id);
    loadData();
  };

  const handleDeleteStoryboard = (id: string) => {
    storageService.deleteStoryboard(id);
    loadData();
  };

  const handleDeleteConversation = (id: string) => {
    storageService.deleteConversation(id);
    loadData();
  };

  const handleDeleteAudio = (id: string) => {
    storageService.deleteAudio(id);
    loadData();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter items
  const filteredImages = images.filter((img) =>
    img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredStoryboards = storyboards.filter((sb) =>
    sb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sb.originalTopic.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredAudios = audios.filter((a) =>
    a.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="media-gallery-container" className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-4 space-y-6">
      {/* Top Header */}
      <div className="rounded-2xl bg-[#11141B] p-5 border border-[#1F2937] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/30">
              <Bookmark className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-bold text-white">المعرض والمحفوظات السابقة</h2>
          </div>
          <p className="text-sm text-slate-300">
            تصفح جميع أعمالك الفنية وسيناريوهات الفيديو والمحادثات التي قمت بإنشائها في جلساتك.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المحفوظات..."
            className="w-full rounded-xl bg-[#0A0C10] border border-[#1F2937] py-2 pr-9 pl-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <Search className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-[#11141B] border border-[#1F2937] text-slate-300 hover:bg-[#1F2937]'
          }`}
        >
          الكل ({images.length + storyboards.length + conversations.length + audios.length})
        </button>
        <button
          onClick={() => setActiveFilter('images')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'images'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-[#11141B] border border-[#1F2937] text-slate-300 hover:bg-[#1F2937]'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>الصور ({images.length})</span>
        </button>
        <button
          onClick={() => setActiveFilter('storyboards')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'storyboards'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-[#11141B] border border-[#1F2937] text-slate-300 hover:bg-[#1F2937]'
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          <span>سيناريوهات الفيديو ({storyboards.length})</span>
        </button>
        <button
          onClick={() => setActiveFilter('conversations')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'conversations'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-[#11141B] border border-[#1F2937] text-slate-300 hover:bg-[#1F2937]'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>المحادثات ({conversations.length})</span>
        </button>
        <button
          onClick={() => setActiveFilter('audios')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'audios'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-[#11141B] border border-[#1F2937] text-slate-300 hover:bg-[#1F2937]'
          }`}
        >
          <Volume2 className="h-3.5 w-3.5" />
          <span>الصوتيات ({audios.length})</span>
        </button>
      </div>

      {/* Grid of items */}
      <div className="space-y-6">
        {/* Images section */}
        {(activeFilter === 'all' || activeFilter === 'images') && filteredImages.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-blue-400" />
              <span>الصور المنشأة</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-xl overflow-hidden bg-[#11141B] border border-[#1F2937] aspect-square"
                >
                  <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#0A0C10]/80 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                    <p className="text-[11px] text-slate-200 line-clamp-3 leading-tight">
                      {img.prompt}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]">
                      <button
                        onClick={() => setPreviewImage(img)}
                        className="p-1.5 rounded-lg bg-[#11141B] text-slate-200 hover:text-white border border-[#1F2937]"
                        title="تكبير"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Storyboards section */}
        {(activeFilter === 'all' || activeFilter === 'storyboards') && filteredStoryboards.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Film className="h-4 w-4 text-blue-400" />
              <span>سيناريوهات وقصص الفيديو</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredStoryboards.map((sb) => (
                <div
                  key={sb.id}
                  className="p-4 rounded-xl bg-[#11141B] border border-[#1F2937] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{sb.title}</h4>
                    <span className="text-xs text-blue-400 bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded">
                      {sb.totalDuration}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">{sb.logline}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#1F2937] text-xs text-slate-400">
                    <span>{sb.scenes?.length || 0} مشاهد • {sb.createdAt}</span>
                    <button
                      onClick={() => handleDeleteStoryboard(sb.id)}
                      className="text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversations section */}
        {(activeFilter === 'all' || activeFilter === 'conversations') && filteredConversations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <span>سجل المحادثات الذكية</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="p-3.5 rounded-xl bg-[#11141B] border border-[#1F2937] space-y-2"
                >
                  <h4 className="text-xs font-bold text-white truncate">{conv.title}</h4>
                  <p className="text-[11px] text-slate-400">
                    {conv.messages?.length || 0} رسائل • النمط: {conv.mode}
                  </p>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDeleteConversation(conv.id)}
                      className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-[#0A0C10]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-[#11141B] border border-[#1F2937] rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
              <h4 className="text-sm font-bold text-white">معاينة الصورة</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[60vh] overflow-hidden rounded-xl bg-[#0A0C10]">
              <img
                src={previewImage.url}
                alt={previewImage.prompt}
                className="max-h-[55vh] object-contain"
              />
            </div>
            <p className="text-xs text-slate-300">{previewImage.prompt}</p>
          </div>
        </div>
      )}
    </div>
  );
};
