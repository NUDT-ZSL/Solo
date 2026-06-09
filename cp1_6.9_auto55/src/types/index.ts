export type MoodType = 'happy' | 'calm' | 'melancholy' | 'anger' | 'anxiety';

export type ShapeType = 'circle' | 'star' | 'diamond';

export interface MoodRecord {
  id: string;
  date: string;
  mood: MoodType;
  text: string;
  time: string;
  shape: ShapeType;
  createdAt: number;
}

export interface MoodStats {
  happy: number;
  calm: number;
  melancholy: number;
  anger: number;
  anxiety: number;
  total: number;
}

export interface AddMoodRequest {
  date: string;
  mood: MoodType;
  text: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const MOOD_LABELS: Record<MoodType, string> = {
  happy: '快乐',
  calm: '平静',
  melancholy: '忧郁',
  anger: '愤怒',
  anxiety: '焦虑',
};

export const MOOD_EMOJIS: Record<MoodType, string> = {
  happy: '😊',
  calm: '😐',
  melancholy: '😢',
  anger: '😡',
  anxiety: '😰',
};
