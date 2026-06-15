export type PathCommandType = 'M' | 'L' | 'C' | 'Q' | 'Z';

export interface PathPoint {
  x: number;
  y: number;
  command: PathCommandType;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export type AnimationType = 'stroke' | 'morph';

export type EasingType = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface AnimationParams {
  type: AnimationType;
  duration: number;
  easing: EasingType;
  isPlaying: boolean;
  progress: number;
  morphTarget?: PathPoint[];
}

export interface HistoryState {
  id: number;
  timestamp: number;
  label: string;
  pathPoints: PathPoint[];
  animationParams: AnimationParams;
  morphTargetPoints?: PathPoint[];
}

export interface ExportConfig {
  animation: AnimationParams;
  pathLength: number;
  createdAt: string;
}
