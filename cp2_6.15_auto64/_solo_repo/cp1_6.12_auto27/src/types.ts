export enum SymbolType {
  PLANET = 'planet',
  LIGHTNING = 'lightning',
  LEAF = 'leaf',
  FIRE = 'fire',
  WATER = 'water',
  STAR = 'star'
}

export const SYMBOL_COLORS: Record<SymbolType, string> = {
  [SymbolType.PLANET]: '#d4a017',
  [SymbolType.LIGHTNING]: '#ffd700',
  [SymbolType.LEAF]: '#32cd32',
  [SymbolType.FIRE]: '#ff4500',
  [SymbolType.WATER]: '#00bfff',
  [SymbolType.STAR]: '#ff69b4'
};

export const SYMBOL_NAMES: Record<SymbolType, string> = {
  [SymbolType.PLANET]: '行星',
  [SymbolType.LIGHTNING]: '闪电',
  [SymbolType.LEAF]: '叶子',
  [SymbolType.FIRE]: '火焰',
  [SymbolType.WATER]: '水滴',
  [SymbolType.STAR]: '星辰'
};

export const ALL_SYMBOL_TYPES: SymbolType[] = [
  SymbolType.PLANET,
  SymbolType.LIGHTNING,
  SymbolType.LEAF,
  SymbolType.FIRE,
  SymbolType.WATER,
  SymbolType.STAR
];

export const GRID_SIZE = 6;
export const MAX_LEVEL = 5;
export const INITIAL_LIVES = 5;
export const MIN_PUSH_INTERVAL = 10;
export const MAX_PUSH_INTERVAL = 30;
export const DEFAULT_PUSH_INTERVAL = 15;
export const COMBO_TIMEOUT = 5000;
export const COMBO_BONUS_THRESHOLD = 10;
export const COMBO_BONUS_SCORE = 5;
export const INITIAL_PIECE_MIN = 15;
export const INITIAL_PIECE_MAX = 20;
export const PUSH_PIECE_MIN = 3;
export const PUSH_PIECE_MAX = 5;
export const MAX_ACTIVE_PARTICLES = 150;

export interface Position {
  row: number;
  col: number;
}

export interface GamePiece {
  id: number;
  type: SymbolType;
  level: number;
  row: number;
  col: number;
  isNew: boolean;
  newTimer: number;
  isMerging: boolean;
  mergeTimer: number;
  isMoving: boolean;
  moveFromRow: number;
  moveFromCol: number;
  moveTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface MergeResult {
  pieces: GamePiece[];
  newPiece: GamePiece | null;
  score: number;
}

export type PushDirection = 'left' | 'bottom';

export interface GameState {
  score: number;
  highScore: number;
  lives: number;
  combo: number;
  lastMergeTime: number;
  isGameOver: boolean;
  pushInterval: number;
  pushTimer: number;
  selectedPiece: GamePiece | null;
}
