import { Conversation, GeneratedImage, VideoStoryboard, AudioItem, GeneratedVideo } from '../types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'nebras_conversations',
  IMAGES: 'nebras_images',
  VIDEOS: 'nebras_videos',
  STORYBOARDS: 'nebras_storyboards',
  AUDIOS: 'nebras_audios',
  SETTINGS: 'nebras_settings',
};

export const storageService = {
  // Conversations
  getConversations: (): Conversation[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveConversation: (conversation: Conversation) => {
    try {
      const list = storageService.getConversations();
      const index = list.findIndex((c) => c.id === conversation.id);
      if (index >= 0) {
        list[index] = conversation;
      } else {
        list.unshift(conversation);
      }
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(list));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  deleteConversation: (id: string) => {
    try {
      const list = storageService.getConversations().filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(list));
    } catch (e) {
      console.error('Storage delete error:', e);
    }
  },

  // Images
  getImages: (): GeneratedImage[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IMAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveImage: (image: GeneratedImage) => {
    try {
      const list = storageService.getImages();
      list.unshift(image);
      // keep max 30 recent images to save quota
      const trimmed = list.slice(0, 30);
      localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Storage image save error:', e);
    }
  },

  deleteImage: (id: string) => {
    try {
      const list = storageService.getImages().filter((img) => img.id !== id);
      localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(list));
    } catch (e) {
      console.error('Storage image delete error:', e);
    }
  },

  // Storyboards
  getStoryboards: (): VideoStoryboard[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORYBOARDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Videos
  getVideos: (): GeneratedVideo[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VIDEOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveVideo: (video: GeneratedVideo) => {
    try {
      const list = storageService.getVideos();
      const index = list.findIndex((v) => v.id === video.id);
      if (index >= 0) {
        list[index] = video;
      } else {
        list.unshift(video);
      }
      const trimmed = list.slice(0, 25);
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Storage video save error:', e);
    }
  },

  deleteVideo: (id: string) => {
    try {
      const list = storageService.getVideos().filter((v) => v.id !== id);
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(list));
    } catch (e) {
      console.error('Storage video delete error:', e);
    }
  },

  saveStoryboard: (storyboard: VideoStoryboard) => {
    try {
      const list = storageService.getStoryboards();
      const index = list.findIndex((s) => s.id === storyboard.id);
      if (index >= 0) {
        list[index] = storyboard;
      } else {
        list.unshift(storyboard);
      }
      localStorage.setItem(STORAGE_KEYS.STORYBOARDS, JSON.stringify(list));
    } catch (e) {
      console.error('Storage storyboard save error:', e);
    }
  },

  deleteStoryboard: (id: string) => {
    try {
      const list = storageService.getStoryboards().filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEYS.STORYBOARDS, JSON.stringify(list));
    } catch (e) {
      console.error('Storage storyboard delete error:', e);
    }
  },

  // Audios
  getAudios: (): AudioItem[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveAudio: (audio: AudioItem) => {
    try {
      const list = storageService.getAudios();
      list.unshift(audio);
      const trimmed = list.slice(0, 20);
      localStorage.setItem(STORAGE_KEYS.AUDIOS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Storage audio save error:', e);
    }
  },

  deleteAudio: (id: string) => {
    try {
      const list = storageService.getAudios().filter((a) => a.id !== id);
      localStorage.setItem(STORAGE_KEYS.AUDIOS, JSON.stringify(list));
    } catch (e) {
      console.error('Storage audio delete error:', e);
    }
  },

  // Clear all
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
    localStorage.removeItem(STORAGE_KEYS.IMAGES);
    localStorage.removeItem(STORAGE_KEYS.STORYBOARDS);
    localStorage.removeItem(STORAGE_KEYS.AUDIOS);
  },
};
