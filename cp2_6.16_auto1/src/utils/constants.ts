import type { EmotionType, EmotionConfig } from '../types';

export const EMOTION_CONFIG: Record<EmotionType, EmotionConfig> = {
  happy: {
    emoji: '😊',
    label: '开心',
    level: 5,
    color: '#4caf50',
  },
  calm: {
    emoji: '😌',
    label: '平静',
    level: 4,
    color: '#2196f3',
  },
  bored: {
    emoji: '😐',
    label: '无聊',
    level: 3,
    color: '#ff9800',
  },
  irritated: {
    emoji: '😠',
    label: '烦躁',
    level: 2,
    color: '#f44336',
  },
  crying: {
    emoji: '😢',
    label: '哭泣',
    level: 1,
    color: '#9c27b0',
  },
};

export const EMOTION_TYPES: EmotionType[] = ['happy', 'calm', 'bored', 'irritated', 'crying'];

export const MIN_DURATION = 5;
export const MAX_DURATION = 60;
export const DEFAULT_DURATION = 20;
