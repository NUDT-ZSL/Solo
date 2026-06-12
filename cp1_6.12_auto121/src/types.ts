export type GradientType = 'linear' | 'radial-circle' | 'radial-ellipse';

export interface GradientConfig {
  startColor: string;
  endColor: string;
  type: GradientType;
  angle: number;
}

export interface SavedPalette extends GradientConfig {
  id: string;
  createdAt: number;
}

export interface HistoryItem extends GradientConfig {
  id: string;
  timestamp: number;
}
