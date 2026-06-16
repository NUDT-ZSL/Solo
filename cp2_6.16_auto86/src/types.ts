export type BubbleType = 'elastic' | 'sticky' | 'fragile' | 'spike';

export interface Bubble {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: BubbleType;
  color: string;
  glowColor: string;
  breathPhase: number;
  isBroken: boolean;
  fragments: Fragment[];
}

export interface Fragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
}

export interface Player {
  x: number;
  y: number;
  vy: number;
  radius: number;
  isStuck: boolean;
  stuckTimer: number;
  currentBubbleId: string | null;
}

export interface Boss {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  health: number;
  maxHealth: number;
  spikeTimer: number;
  active: boolean;
}

export interface TrackingSpike {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  isReflected: boolean;
  active: boolean;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export type GamePhase = 'menu' | 'playing' | 'paused' | 'boss' | 'reward' | 'gameover';

export interface GameState {
  phase: GamePhase;
  level: number;
  score: number;
  lives: number;
  maxLives: number;
  scoreMultiplier: number;
  bubbles: Bubble[][];
  boss: Boss | null;
  trackingSpikes: TrackingSpike[];
  cameraY: number;
}

export interface PhysicsState {
  player: Player;
  bubbles: Bubble[][];
  spikes: TrackingSpike[];
}
