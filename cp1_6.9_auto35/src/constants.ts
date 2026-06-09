import type { EmotionBlock } from './types';

export const EMOTION_BLOCKS: EmotionBlock[] = [
  { id: 'anger', name: '愤怒', color: '#FF4444', emoji: '😠' },
  { id: 'calm', name: '宁静', color: '#4488FF', emoji: '😌' },
  { id: 'joy', name: '欢快', color: '#FFDD44', emoji: '😄' },
  { id: 'melancholy', name: '忧郁', color: '#AA44FF', emoji: '😢' },
  { id: 'fear', name: '恐惧', color: '#888888', emoji: '😨' },
  { id: 'surprise', name: '惊喜', color: '#FF8844', emoji: '😲' },
];

export const MAX_BLOCKS = 3;
export const COLOR_WEIGHTS = [0.6, 0.3, 0.1];
export const GALLERY_PAGE_SIZE = 12;
