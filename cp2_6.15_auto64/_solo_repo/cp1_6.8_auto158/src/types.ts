export interface Vec2 {
  x: number;
  y: number;
}

export interface FragmentDef {
  id: number;
  vertices: Vec2[];
  color: string;
  glowColor: string;
  targetPosition: Vec2;
  targetRotation: number;
  gravity: boolean;
  magnetic: 'attract' | 'repel' | 'none';
  magneticRange: number;
}

export interface Fragment {
  id: number;
  vertices: Vec2[];
  color: string;
  glowColor: string;
  position: Vec2;
  rotation: number;
  targetPosition: Vec2;
  targetRotation: number;
  gravity: boolean;
  magnetic: 'attract' | 'repel' | 'none';
  magneticRange: number;
  state: 'idle' | 'dragging' | 'snapping' | 'merged';
  glowIntensity: number;
  pulsePhase: number;
  snapFrom: Vec2 | null;
  snapProgress: number;
  mergeFlashTimer: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  gridSpacing: number;
  fragments: FragmentDef[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type GamePhase = 'idle' | 'playing' | 'portal' | 'transitioning' | 'complete';
