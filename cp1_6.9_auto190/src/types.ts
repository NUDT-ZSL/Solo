export type EmotionType = '惊喜' | '宁静' | '怀念' | '冒险' | '浪漫' | '激动';

export interface Card {
  id: string;
  title: string;
  note: string;
  date: string;
  lat: number;
  lng: number;
  city: string;
  emotion: EmotionType;
  image: string;
  dominantColor: string;
  order: number;
}

export interface CityOption {
  name: string;
  lat: number;
  lng: number;
}

export const EMOTION_COLORS: Record<EmotionType, string> = {
  '惊喜': '#FF6B35',
  '宁静': '#4ECDC4',
  '怀念': '#9B59B6',
  '冒险': '#E74C3C',
  '浪漫': '#FF69B4',
  '激动': '#F39C12'
};

export const EMOTIONS: EmotionType[] = ['惊喜', '宁静', '怀念', '冒险', '浪漫', '激动'];
