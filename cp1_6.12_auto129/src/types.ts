export interface EpicycleConfig {
  id: string;
  radius: number;
  angularVelocity: number;
  phase: number;
  color: string;
}

export interface TracePoint {
  x: number;
  y: number;
  time: number;
}

export interface EpicycleState {
  x: number;
  y: number;
  angle: number;
}

export type PlaybackSpeed = 0.5 | 1 | 2;
