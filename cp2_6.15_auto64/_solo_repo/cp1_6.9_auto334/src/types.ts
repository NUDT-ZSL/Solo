export interface Poem {
  id: string;
  content: string;
  createdAt: number;
  viewed: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  char: string;
  strokeCount: number;
  baseSize: number;
  baseAlpha: number;
  color: string;
  pathProgress: number;
  pathOffset: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
  dragProgress: number;
  targetX: number;
  targetY: number;
  originalPathProgress: number;
}

export interface ExplosionParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface StreamerTrail {
  id: number;
  x: number;
  y: number;
  angle: number;
  length: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export type ViewMode = 'editor' | 'browse' | 'gallery';
