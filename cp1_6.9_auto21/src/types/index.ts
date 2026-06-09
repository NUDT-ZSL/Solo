export type Emotion = 'positive' | 'calm' | 'sad';

export interface PoemData {
  id?: string;
  title: string;
  author: string;
  background?: string;
  lines: string[];
  emotion: Emotion;
  isCustom: boolean;
}

export interface ThemeData {
  id: string;
  name: string;
  icon: string;
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
}

export interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  color: string;
  size: number;
  alpha: number;
  progress: number;
  delay: number;
  lineIndex: number;
  charIndex: number;
}

export interface CardData {
  id: string;
  poem: PoemData;
  themeId: string;
  audioBase64: string | null;
  audioMimeType: string;
  createdAt: number;
  thumbnailDataUrl?: string;
}

export interface GenerateCardRequest {
  poem: PoemData;
  themeId: string;
  audioBase64: string | null;
  audioMimeType: string;
  thumbnailDataUrl?: string;
}

export interface GenerateCardResponse {
  success: boolean;
  cardId: string;
  shareUrl: string;
}

export interface GetCardResponse {
  success: boolean;
  card: CardData | null;
}

export interface GetCardsResponse {
  success: boolean;
  cards: CardData[];
  total: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBase64: string | null;
  audioMimeType: string;
  waveformData: number[];
}

export const EMOTION_COLORS: Record<Emotion, string> = {
  positive: '#28B463',
  calm: '#5B6ABF',
  sad: '#E74C3C',
};

export const EMOTION_LABELS: Record<Emotion, string> = {
  positive: '积极',
  calm: '平静',
  sad: '悲伤',
};
