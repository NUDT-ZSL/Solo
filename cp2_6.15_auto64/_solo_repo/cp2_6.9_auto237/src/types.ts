export interface Point {
  id: string;
  name: string;
  type: SoundType;
  color: string;
  x: number;
  y: number;
  uploader: string;
  audioUrl: string;
  duration: number;
  likes: number;
  plays: number;
  createdAt: number;
  waveform?: number[];
}

export type SoundType = 'city' | 'nature' | 'culture' | 'tech' | 'mystery' | 'other';

export interface Comment {
  id: string;
  pointId: string;
  username: string;
  content: string;
  createdAt: number;
  likes: number;
  likedBy?: string[];
}

export const SOUND_COLORS: Record<SoundType, string> = {
  city: '#FF6B6B',
  nature: '#FFD93D',
  culture: '#6BCB77',
  tech: '#4D96FF',
  mystery: '#9B59B6',
  other: '#00E5FF'
};

export const SOUND_ICONS: Record<SoundType, string> = {
  city: '🚗',
  nature: '🌬️',
  culture: '💧',
  tech: '🐾',
  mystery: '👤',
  other: '🔊'
};

export const SOUND_NAMES: Record<SoundType, string> = {
  city: '城市',
  nature: '自然',
  culture: '人文',
  tech: '科技',
  mystery: '神秘',
  other: '其他'
};
