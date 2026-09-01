export type ActiveTab = 'chat' | 'image' | 'video' | 'audio' | 'gallery';

export type ChatMode = 'balanced' | 'fast' | 'deep' | 'creative' | 'code';

export interface ChatMessageMedia {
  type: 'image' | 'video';
  url?: string;
  thumbnailUrl?: string;
  prompt?: string;
  enhancedPrompt?: string;
  aspectRatio?: string;
  style?: string;
  resolution?: string;
  operationName?: string;
  status?: 'generating' | 'completed' | 'failed';
  statusMessage?: string;
  error?: string;
  downloadUrl?: string;
  filename?: string;
  sourceImage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  images?: string[]; // base64 urls
  isStreaming?: boolean;
  useSearch?: boolean;
  mediaType?: 'text' | 'image' | 'video';
  media?: ChatMessageMedia;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  mode: ChatMode;
}

export type ImageStyle = 
  | 'realistic' 
  | 'islamic_art' 
  | 'digital_art' 
  | 'anime' 
  | 'three_d' 
  | 'logo';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  enhancedPrompt?: string;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  createdAt: string;
  description?: string;
}

export interface VideoScene {
  sceneNumber: number;
  timestamp: string;
  visualDescription: string;
  cameraAngle: string;
  voiceoverArabic: string;
  soundEffects: string;
  veoPromptEnglish: string;
  keyframeColor?: string;
}

export interface VideoStoryboard {
  id: string;
  title: string;
  logline: string;
  mood: string;
  totalDuration: string;
  scenes: VideoScene[];
  createdAt: string;
  originalTopic: string;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  createdAt: string;
  duration?: string;
  operationName?: string;
}

export interface VeoGenerationJob {
  id: string;
  operationName: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  createdAt: string;
  error?: string;
}

export interface AudioItem {
  id: string;
  text: string;
  audioBase64?: string;
  voice: string;
  createdAt: string;
  tone?: string;
}

export interface PromptTemplate {
  id: string;
  category: 'كتابة وتسويق' | 'توليد صور' | 'فيديو وسيناريو' | 'برمجة وتطوير' | 'تعليم وبحث' | 'فنون وأدب';
  title: string;
  description: string;
  prompt: string;
  targetTab: ActiveTab;
  iconName: string;
}
