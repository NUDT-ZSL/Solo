export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  fadeIn: number;
  fadeOut: number;
  url: string;
  albumCover?: string;
}

export interface Mixtape {
  id: string;
  title: string;
  description: string;
  songs: Song[];
  theme: 'classic' | 'neon' | 'minimal';
  createdAt: string;
  totalDuration: number;
  coverUrl?: string;
}

export interface Comment {
  id: string;
  mixtapeId: string;
  timestamp: number;
  content: string;
  createdAt: string;
}

export type StickerType = 'heart' | 'fire' | 'lightning' | 'star' | 'moon' | 'note';

export interface Sticker {
  id: string;
  type: StickerType;
  timestamp: number;
  position: { x: number; y: number };
  count: number;
}

export type ThemeType = 'classic' | 'neon' | 'minimal';

export interface ThemeConfig {
  name: string;
  primary: string;
  secondary: string;
  background: string;
}

export const THEMES: Record<ThemeType, ThemeConfig> = {
  classic: {
    name: '经典磁带',
    primary: '#2C3E50',
    secondary: '#34495E',
    background: 'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)'
  },
  neon: {
    name: '霓虹',
    primary: '#FF6B6B',
    secondary: '#F0E68C',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #F0E68C 100%)'
  },
  minimal: {
    name: '极简白',
    primary: '#F5F5F5',
    secondary: '#E0E0E0',
    background: 'linear-gradient(135deg, #F5F5F5 0%, #E0E0E0 100%)'
  }
};

export const STICKER_COLORS: Record<StickerType, string> = {
  heart: '#FF4757',
  fire: '#FF6348',
  lightning: '#FDCB6E',
  star: '#6C5CE7',
  moon: '#A29BFE',
  note: '#00CEC9'
};

export const STICKER_EMOJIS: Record<StickerType, string> = {
  heart: '❤️',
  fire: '🔥',
  lightning: '⚡',
  star: '⭐',
  moon: '🌙',
  note: '🎵'
};
