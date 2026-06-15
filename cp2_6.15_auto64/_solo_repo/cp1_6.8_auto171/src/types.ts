export type EmotionType = 'calm' | 'joy' | 'anxiety';

export interface MeditationRecord {
  id: string;
  duration: number;
  depth: number;
  emotion: EmotionType;
  createdAt: string;
  encouragement: string;
}

export interface DailyStats {
  date: string;
  totalDuration: number;
  sessionCount: number;
}

export interface EmotionDistribution {
  calm: number;
  joy: number;
  anxiety: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
}

export interface FlowerNode {
  x: number;
  y: number;
  record: MeditationRecord;
  scale: number;
  targetScale: number;
  color: string;
  petalCount: number;
  angle: number;
  bloomed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  opacityDir: number;
}

export const EMOTION_COLORS: Record<EmotionType, string> = {
  calm: '#6BA3BE',
  joy: '#F2C94C',
  anxiety: '#E8A87C',
};

export const EMOTION_LABELS: Record<EmotionType, string> = {
  calm: '宁静',
  joy: '喜悦',
  anxiety: '焦虑',
};

export const DEPTH_LABELS = ['浅层', '较浅', '中等', '较深', '深层'] as const;
