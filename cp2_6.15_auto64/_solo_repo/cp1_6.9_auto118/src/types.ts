export interface LevelConfig {
  level: number;
  canvasSize: number;
  pieceCount: number;
  colorCount: number;
  magnetStrengthVariance: number;
}

export interface Vertex {
  x: number;
  y: number;
}

export interface PuzzlePiece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  pole: '+' | '-';
  magnetStrength: number;
  vertices: Vertex[];
  color: string;
  gradientColors: [string, string];
  isSnapped: boolean;
  isDragging: boolean;
  dragStartTime: number;
  dragOffsetX: number;
  dragOffsetY: number;
  flashTimer: number;
  area: number;
  centroid: Vertex;
  cachedCanvas: HTMLCanvasElement | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  active: boolean;
}

export type GameState = 'idle' | 'playing' | 'levelComplete' | 'gameComplete';

export interface GameStats {
  currentLevel: number;
  snappedCount: number;
  totalPieces: number;
  elapsedSeconds: number;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, canvasSize: 500, pieceCount: 4, colorCount: 6, magnetStrengthVariance: 0 },
  { level: 2, canvasSize: 550, pieceCount: 5, colorCount: 6, magnetStrengthVariance: 0 },
  { level: 3, canvasSize: 600, pieceCount: 6, colorCount: 7, magnetStrengthVariance: 0 },
  { level: 4, canvasSize: 650, pieceCount: 8, colorCount: 7, magnetStrengthVariance: 0.2 },
  { level: 5, canvasSize: 700, pieceCount: 9, colorCount: 8, magnetStrengthVariance: 0.3 },
];

export const PHYSICS = {
  MAGNET_RANGE: 80,
  ATTRACT_FORCE: 0.5,
  REPEL_FORCE: 1.0,
  RESTITUTION: 0.3,
  FRICTION: 0.85,
  DRAG_THRESHOLD_MS: 300,
  SNAP_DISTANCE: 15,
  HIGHLIGHT_DISTANCE: 30,
  FIXED_DT: 1000 / 60,
} as const;

export const COLOR_PALETTES: string[][] = [
  ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
  ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E91E63', '#00BCD4'],
  ['#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#673AB7', '#009688', '#E91E63', '#607D8B'],
];
