import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { ChatStudio } from './components/ChatStudio';
import { ImageStudio } from './components/ImageStudio';
import { VideoStudio } from './components/VideoStudio';
import { AudioVoiceStudio } from './components/AudioVoiceStudio';
import { MediaGallery } from './components/MediaGallery';
import { QuickTemplatesModal } from './components/QuickTemplatesModal';
import { ActiveTab, PromptTemplate } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string>('');

  const handleSelectTemplate = (template: PromptTemplate) => {
    setActiveTab(template.targetTab);
    setInitialPrompt(template.prompt);
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E2E8F0] flex flex-col selection:bg-blue-600/30 selection:text-blue-200">
      {/* Top Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
      />

      {/* Main Studio Content Area */}
      <main className="flex-1 flex flex-col p-2 sm:p-4">
        {activeTab === 'chat' && (
          <ChatStudio
            initialPrompt={initialPrompt}
            onClearInitialPrompt={() => setInitialPrompt('')}
          />
        )}

        {activeTab === 'image' && (
          <ImageStudio
            initialPrompt={initialPrompt}
            onClearInitialPrompt={() => setInitialPrompt('')}
          />
        )}

        {activeTab === 'video' && (
          <VideoStudio
            initialPrompt={initialPrompt}
            onClearInitialPrompt={() => setInitialPrompt('')}
          />
        )}

        {activeTab === 'audio' && <AudioVoiceStudio />}

        {activeTab === 'gallery' && <MediaGallery />}
      </main>

      {/* Quick Templates Modal */}
      <QuickTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}
