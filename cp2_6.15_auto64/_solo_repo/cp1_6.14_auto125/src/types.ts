export interface Emotions {
  joy: number;
  fear: number;
  anger: number;
  surprise: number;
}

export interface EmotionData {
  timestamp: number;
  userId: string;
  emotions: Emotions;
}

export type EmotionKey = keyof Emotions;
