import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ChatStudio } from './components/ChatStudio';
import { ImageStudio } from './components/ImageStudio';
import { VideoStudio } from './components/VideoStudio';
import { AudioVoiceStudio } from './components/AudioVoiceStudio';
import { MediaGallery } from './components/MediaGallery';
import { QuickTemplatesModal } from './components/QuickTemplatesModal';
import { ActiveTab, PromptTemplate } from './types';
import { isNative } from './utils/nativeUtils';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string>('');

  // Native Android StatusBar and hardware back button configuration
  useEffect(() => {
    if (isNative()) {
      try {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#0A0D14' });
      } catch (e) {
        console.log('StatusBar error:', e);
      }

      const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (isTemplatesOpen) {
          setIsTemplatesOpen(false);
        } else if (activeTab !== 'chat') {
          setActiveTab('chat');
        } else if (!canGoBack) {
          CapApp.exitApp();
        }
      });

      return () => {
        backListener.then((sub) => sub.remove());
      };
    }
  }, [isTemplatesOpen, activeTab]);

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
