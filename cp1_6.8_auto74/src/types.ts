export type MoodColor =
  | '#FF9AA2'
  | '#FFB7B2'
  | '#FFDAC1'
  | '#E2F0CB'
  | '#B5EAD7'
  | '#C7CEEA'
  | '#B8A9C9'
  | '#F8C8DC';

export interface DiaryEntry {
  id: string;
  text: string;
  moodColor: MoodColor;
  createdAt: number;
}

export interface MoodStat {
  color: MoodColor;
  label: string;
  count: number;
  percentage: number;
}

export interface TrendData {
  date: string;
  avgMood: number;
}

export interface BubbleData {
  id: string;
  diaryId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: MoodColor;
  opacity: number;
  scale: number;
  targetScale: number;
  phase: number;
  breathPhase: number;
  floatAmplitude: number;
  floatSpeed: number;
  breathSpeed: number;
  fadeInAt: number;
  hovered: boolean;
}
