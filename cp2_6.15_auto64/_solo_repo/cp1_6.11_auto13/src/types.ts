export type MusicStyle = 'calm' | 'joyful' | 'nostalgic' | 'passionate' | 'mysterious';

export interface Capsule {
  id: string;
  title: string;
  content: string;
  images: string[];
  musicStyle: MusicStyle;
  createdAt: number;
  unlockAt: number;
}

export type CapsuleStatus = 'locked' | 'unlocked';

export const MUSIC_STYLE_LABELS: Record<MusicStyle, string> = {
  calm: '静谧',
  joyful: '欢快',
  nostalgic: '怀旧',
  passionate: '激昂',
  mysterious: '神秘'
};

export const MUSIC_STYLE_GRADIENTS: Record<MusicStyle, { from: string; to: string }> = {
  calm: { from: '#4FC3F7', to: '#0288D1' },
  joyful: { from: '#FFB74D', to: '#FF8F00' },
  nostalgic: { from: '#A1887F', to: '#5D4037' },
  passionate: { from: '#EF5350', to: '#C62828' },
  mysterious: { from: '#AB47BC', to: '#6A1B9A' }
};

export const MUSIC_STYLE_PARTICLE_COLORS: Record<MusicStyle, string[]> = {
  calm: ['#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6'],
  joyful: ['#FFECB3', '#FFD54F', '#FFB300', '#FF8F00'],
  nostalgic: ['#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63'],
  passionate: ['#FFCDD2', '#EF9A9A', '#EF5350', '#E53935'],
  mysterious: ['#E1BEE7', '#CE93D8', '#AB47BC', '#8E24AA']
};
