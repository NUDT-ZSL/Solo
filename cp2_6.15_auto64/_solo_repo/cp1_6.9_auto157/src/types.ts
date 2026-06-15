export type MoodType = 'happy' | 'calm' | 'melancholy' | 'excited' | 'tired';

export const MOOD_EMOJIS: Record<MoodType, string> = {
  happy: '😊',
  calm: '😌',
  melancholy: '😢',
  excited: '🤩',
  tired: '😴'
};

export const MOOD_LABELS: Record<MoodType, string> = {
  happy: '开心',
  calm: '平静',
  melancholy: '忧郁',
  excited: '兴奋',
  tired: '疲惫'
};

export interface WatercolorBlob {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  baseOpacity: number;
  angle: number;
  breathPeriod: number;
  breathPhase: number;
}

export interface ColorScheme {
  blobs: WatercolorBlob[];
  baseColor: string;
  accentColors: string[];
  inkColor: string;
  mood: MoodType;
  dateStr: string;
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  isDry: boolean;
  dryProgress: number;
  spreadRadius: number;
  completedAt: number;
}

export interface ClearParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  rotation: number;
  vr: number;
}

export interface Decoration {
  type: 'flower' | 'leaf' | 'circle' | 'line';
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  opacity: number;
}
