export type GameState = 'idle' | 'playing' | 'victory' | 'defeat' | 'transition';

export type TrackId = 'Q' | 'W' | 'E';

export type HitResult = 'perfect' | 'normal' | 'miss';

export interface Note {
  id: string;
  track: TrackId;
  angle: number;
  speed: number;
  hit: boolean;
  missed: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface HitEffect {
  id: string;
  track: TrackId;
  type: HitResult;
  time: number;
  duration: number;
}

export interface FlameEffect {
  track: TrackId;
  intensity: number;
}

export interface GameSnapshot {
  notes: Note[];
  score: number;
  combo: number;
  comboMultiplier: number;
  offeringProgress: number;
  gameState: GameState;
  hitEffects: HitEffect[];
  flameEffects: FlameEffect[];
  transitionProgress: number;
  victoryProgress: number;
  finalScore: number;
}

export const CONFIG = {
  WAVE_INTERVAL: 1.2,
  NOTE_SPEED: 60,
  ORBIT_RADIUS: 80,
  PERFECT_THRESHOLD: 8,
  NORMAL_THRESHOLD: 16,
  PERFECT_SCORE: 300,
  NORMAL_SCORE: 100,
  COMBO_THRESHOLD: 5,
  PERFECT_OFFERING: 3,
  NORMAL_OFFERING: 1,
  MISS_OFFERING: -2,
  CANVAS_SIZE: 640,
  TOTEM_COUNT: 3,
  TOTEM_WIDTH: 40,
  TOTEM_HEIGHT: 200,
  TOTEM_SPACING: 40,
  NOTE_RADIUS: 12,
  TRANSITION_DURATION: 0.4,
  VICTORY_DURATION: 1.3,
  MAX_PARTICLES: 100,
} as const;

export const TRACK_COLORS: Record<TrackId, string> = {
  Q: '#ff4444',
  W: '#ffbb33',
  E: '#44bb44',
};

export const TOTEM_COLORS = ['#8b5a2b', '#a0522d', '#cd853f'];
