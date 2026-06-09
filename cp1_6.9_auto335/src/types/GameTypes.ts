export interface GameState {
  timeScale: number;
  repairProgress: number;
  totalTargets: number;
  repairedTargets: number;
  fps: number;
}

export interface Repairable {
  id: string;
  type: 'gear' | 'pendulum' | 'spring';
  repaired: boolean;
  repairCount: number;
  requiredHits: number;
  x: number;
  y: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';
