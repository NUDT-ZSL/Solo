export type EmotionTag =
  | 'serene'
  | 'noisy'
  | 'melancholy'
  | 'cheerful'
  | 'mysterious'
  | 'leisurely'
  | 'tense'
  | 'warm'
  | 'ethereal'
  | 'nostalgic';

export const EMOTION_LABELS: Record<EmotionTag, string> = {
  serene: '宁静',
  noisy: '喧闹',
  melancholy: '忧郁',
  cheerful: '欢快',
  mysterious: '神秘',
  leisurely: '悠然',
  tense: '紧张',
  warm: '温馨',
  ethereal: '空灵',
  nostalgic: '怀恋',
};

export const EMOTION_COLORS: Record<EmotionTag, string> = {
  serene: '#6ECB63',
  noisy: '#FF6B6B',
  melancholy: '#5C6BC0',
  cheerful: '#FFD93D',
  mysterious: '#AB47BC',
  leisurely: '#26A69A',
  tense: '#EF5350',
  warm: '#FF8A65',
  ethereal: '#42A5F5',
  nostalgic: '#8D6E63',
};

export const ALL_EMOTION_TAGS: EmotionTag[] = [
  'serene',
  'noisy',
  'melancholy',
  'cheerful',
  'mysterious',
  'leisurely',
  'tense',
  'warm',
  'ethereal',
  'nostalgic',
];

export interface SoundMarker {
  id: string;
  userId: string;
  username: string;
  lat: number;
  lng: number;
  title: string;
  note: string;
  audioUrl: string;
  imageUrl: string;
  emotionTag: EmotionTag;
  isPublic: boolean;
  likes: number;
  likesToday: number;
  playCount: number;
  comments: Comment[];
  createdAt: string;
  expiresAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  markerId: string;
  note: string;
  createdAt: string;
  marker?: SoundMarker;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface MarkerFormData {
  lat: number;
  lng: number;
  title: string;
  note: string;
  emotionTag: EmotionTag;
  audioFile: File;
  imageFile: File;
}
