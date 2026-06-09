export enum CellType {
  EMPTY = 0,
  WALL = 1,
  TRAP = 2,
  VINE = 3,
  CRYSTAL = 4,
  EXIT = 5,
  START = 6,
}

export type MazeGrid = CellType[][];

export interface Crystal {
  x: number;
  y: number;
  activated: boolean;
  glowPhase: number;
}

export interface VineGrowth {
  x: number;
  y: number;
  progress: number;
}

export interface Seed {
  gridX: number;
  gridY: number;
  renderX: number;
  renderY: number;
  moving: boolean;
  moveProgress: number;
  moveDuration: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export type GamePhase = 'playing' | 'gameover' | 'victory' | 'transition' | 'levelBanner';

export interface GameState {
  level: number;
  elapsed: number;
  grid: MazeGrid;
  gridSize: number;
  cellSize: number;
  seed: Seed;
  crystals: Crystal[];
  vineGrowths: VineGrowth[];
  exitActive: boolean;
  exitPos: { x: number; y: number } | null;
  phase: GamePhase;
  transitionProgress: number;
  bannerTimer: number;
  gameOverTimer: number;
  victoryTimer: number;
}

export interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  sizeJitter: number;
  colorPhase: number;
}

export interface EffectParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
  type: 'crystal' | 'gameover' | 'victory' | 'vineGlow';
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameCallbacks {
  onUIUpdate: (ui: {
    level: number;
    elapsed: number;
    crystalsTotal: number;
    crystalsActivated: number;
    phase: GamePhase;
    finalLevel: number;
    totalTime: number;
  }) => void;
}
