export interface Point {
  x: number;
  y: number;
}

export interface InkPoint extends Point {
  pressure: number;
  timestamp: number;
}

export interface InkBranch {
  points: Point[];
  opacity: number;
  color: string;
  width: number;
}

export interface InkStroke {
  id: string;
  points: InkPoint[];
  branches: InkBranch[];
  color: string;
  opacity: number;
  baseWidth: number;
  createdAt: number;
  isActive: boolean;
  diffusionRadius: number;
  diffusionComplete: boolean;
}

export interface DiffusionArea {
  centerX: number;
  centerY: number;
  radius: number;
  color: string;
  opacity: number;
  blurRadius: number;
  createdAt: number;
  duration: number;
}

export interface BrushSettings {
  size: number;
  density: number;
}

export interface RendererStats {
  avgDensity: number;
  totalLength: number;
  densityGrid: number[][];
}

export interface HeatmapCell {
  x: number;
  y: number;
  density: number;
}
