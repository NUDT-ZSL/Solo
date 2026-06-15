export type EmotionCategory = 'positive' | 'negative' | 'neutral';

export interface EmotionAnalysis {
  category: EmotionCategory;
  score: number;
  keywords: string[];
}

export interface ColorStop {
  color: string;
  position: number;
}

export interface ColorPalette {
  gradient: ColorStop[];
  glowColor: string;
  primaryColor: string;
}

export interface CurveConfig {
  startX: number;
  startY: number;
  amplitude: number;
  frequency: number;
  phase: number;
  speed: number;
  rotationSpeed: number;
  length: number;
  lineWidth: number;
  colorOffset: number;
}

export interface ArtGenerationResponse {
  id: string;
  emotion: EmotionAnalysis;
  palette: ColorPalette;
  curves: CurveConfig[];
  curveCount: number;
}

export interface ArtSaveRequest {
  text: string;
  emotion: EmotionAnalysis;
  palette: ColorPalette;
  curves: CurveConfig[];
  thumbnail: string;
}

export interface ArtSaveResponse {
  id: string;
  shortUrl: string;
}

export interface ArtRecord {
  id: string;
  text: string;
  emotion: EmotionAnalysis;
  palette: ColorPalette;
  curves: CurveConfig[];
  thumbnail: string;
  createdAt: number;
}
