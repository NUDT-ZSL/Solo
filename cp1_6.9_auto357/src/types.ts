export interface Entry {
  id: string;
  text: string;
  amount: number;
  emotion: EmotionType;
  timestamp: string;
}

export type EmotionType = 'happy' | 'anxious' | 'calm' | 'surprised' | 'tired';

export const EMOTION_CONFIG: Record<EmotionType, { label: string; color: string; gradient: string }> = {
  happy: { label: '快乐', color: '#FFD700', gradient: 'radial-gradient(circle, #FFD700 0%, #FFA500 100%)' },
  anxious: { label: '焦虑', color: '#8B5CF6', gradient: 'radial-gradient(circle, #8B5CF6 0%, #6D28D9 100%)' },
  calm: { label: '平静', color: '#60A5FA', gradient: 'radial-gradient(circle, #60A5FA 0%, #3B82F6 100%)' },
  surprised: { label: '惊喜', color: '#F97316', gradient: 'radial-gradient(circle, #F97316 0%, #EA580C 100%)' },
  tired: { label: '疲惫', color: '#84CC16', gradient: 'radial-gradient(circle, #84CC16 0%, #65A30D 100%)' },
};

export interface ChipState {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  baseRadius: number;
  opacity: number;
  createdAt: number;
  lastDirectionChange: number;
  lastOpacityChange: number;
  pausedUntil: number;
  entry: Entry;
}
