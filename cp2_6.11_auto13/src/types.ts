export interface Capsule {
  id: string;
  title: string;
  content: string;
  images: string[];
  musicStyle: MusicStyle;
  unlockDate: string;
  createdAt: string;
  isUnlocked: boolean;
}

export type MusicStyle = 'calm' | 'joyful' | 'nostalgic' | 'energetic' | 'mysterious';

export interface MusicStyleConfig {
  name: string;
  gradient: string;
  particles: string;
}

export const MUSIC_STYLES: Record<MusicStyle, MusicStyleConfig> = {
  calm: {
    name: '静谧',
    gradient: 'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)',
    particles: 'snow',
  },
  joyful: {
    name: '欢快',
    gradient: 'linear-gradient(135deg, #FFB74D 0%, #FF8F00 100%)',
    particles: 'bubbles',
  },
  nostalgic: {
    name: '怀旧',
    gradient: 'linear-gradient(135deg, #A1887F 0%, #5D4037 100%)',
    particles: 'leaves',
  },
  energetic: {
    name: '激昂',
    gradient: 'linear-gradient(135deg, #EF5350 0%, #C62828 100%)',
    particles: 'sparks',
  },
  mysterious: {
    name: '神秘',
    gradient: 'linear-gradient(135deg, #AB47BC 0%, #6A1B9A 100%)',
    particles: 'stars',
  },
};
