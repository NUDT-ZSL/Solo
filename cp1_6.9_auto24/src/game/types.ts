export interface Vector2 {
  x: number;
  y: number;
}

export interface WebNode {
  id: number;
  pos: Vector2;
  orbitParticles: OrbitParticle[];
}

export interface WebConnection {
  from: number;
  to: number;
  broken: boolean;
  breakProgress: number;
}

export interface OrbitParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
}

export interface Firefly {
  id: number;
  pos: Vector2;
  bezierPoints: Vector2[];
  progress: number;
  speed: number;
  size: number;
  captured: boolean;
  targetNodeId: number | null;
  slideProgress: number;
}

export interface Dewdrop {
  id: number;
  pos: Vector2;
  bezierPoints: Vector2[];
  progress: number;
  speed: number;
  size: number;
  captured: boolean;
  targetNodeId: number | null;
  slideProgress: number;
}

export interface BurstParticle {
  pos: Vector2;
  vel: Vector2;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface BreakParticle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
}

export type GameState = 'playing' | 'paused' | 'gameover';

export interface GameStatus {
  energy: number;
  level: number;
  captureCount: number;
  state: GameState;
}
