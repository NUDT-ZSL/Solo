export type ScentType = 'floral' | 'food' | 'nature' | 'urban';
export type EmotionType = 'happy' | 'calm' | 'melancholy' | 'excited' | 'nostalgic';

export interface ScentEntry {
  id: string;
  scentType: ScentType;
  description: string;
  emotion: EmotionType;
  imageData?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export const SCENT_COLORS: Record<ScentType, string> = {
  floral: '#FFB6C1',
  food: '#FFBF00',
  nature: '#7CCD7C',
  urban: '#6B7B8D',
};

export const EMOTION_GRADIENTS: Record<EmotionType, [string, string]> = {
  happy: ['#FFD700', '#FFA500'],
  calm: ['#87CEEB', '#4682B4'],
  melancholy: ['#C0B4D0', '#A69AC8'],
  excited: ['#FF6B6B', '#FF4757'],
  nostalgic: ['#DEB887', '#CD853F'],
};

export const SCENT_LABELS: Record<ScentType, string> = {
  floral: '花香',
  food: '食物香',
  nature: '自然香',
  urban: '城市香',
};

export const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: '快乐',
  calm: '平静',
  melancholy: '忧郁',
  excited: '兴奋',
  nostalgic: '怀旧',
};

export const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happy: '😊',
  calm: '😌',
  melancholy: '😔',
  excited: '🤩',
  nostalgic: '🥺',
};
