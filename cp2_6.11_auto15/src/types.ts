export const RUNE_SYMBOLS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ'];
export const LOCK_SYMBOL = '⚷';

export const COLORS = {
  bgStart: '#1A1124',
  bgEnd: '#2C1B4D',
  runeDefault: '#C0B8D0',
  runePulseStart: '#7AB8FF',
  runePulseEnd: '#4A8CFF',
  pathColor: 'rgba(100, 220, 255, 0.5)',
  pathPreviewColor: 'rgba(100, 220, 255, 0.3)',
  energyBallMain: '#4A8CFF',
  energyBallSub: '#FF884D',
  lockRune: '#5A5A6A',
  unlockGold: '#FFD700',
  invalidFlash: '#FF4D4D',
  glowBorder: 'rgba(123, 107, 154, 0.3)',
  hoverGlow: 0.5,
  clickGlow: 1.0,
  comboBadge: '#FFB833',
  levelText: '#D4AF37',
  intersectionRainbow: ['#FF0000', '#FF8800', '#FFFF00', '#00FF00', '#0088FF', '#8800FF'],
};

export const RUNE_ACTIVATION_COLORS = ['#C0B8D0', '#7AB8FF', '#4A6CFF', '#6B3FA0'];

export const GRID_COLS = 6;
export const GRID_ROWS = 8;
export const HEX_GAP = 5;
export const MIN_HEX_SIZE = 20;

export const ENERGY_BALL_SPEED = 30;
export const TRAIL_LENGTH = 15;
export const COMBO_WINDOW = 3;
export const MAX_PARTICLES = 200;
export const AUTO_SAVE_INTERVAL = 3;

export const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export const LOCKS_PER_LEVEL = 3;

export const HEX_DIRECTIONS_EVEN = [
  { dq: 1, dr: 0 }, { dq: 0, dr: -1 }, { dq: -1, dr: -1 },
  { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 },
];

export const HEX_DIRECTIONS_ODD = [
  { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
  { dq: -1, dr: 0 }, { dq: 0, dr: 1 }, { dq: 1, dr: 1 },
];

export interface HexCell {
  q: number;
  r: number;
  symbol: string;
  isLocked: boolean;
  isPassable: boolean;
  activationCount: number;
  lastActivatedTime: number;
  x: number;
  y: number;
  pulseTime: number;
  shakeTime: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  unlockAnimTime: number;
  isUnlockAnimating: boolean;
}

export interface EnergyBall {
  id: number;
  x: number;
  y: number;
  pathIndex: number;
  pathProgress: number;
  isMain: boolean;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
  active: boolean;
  currentCell: HexCell | null;
  waitingAtIntersection: boolean;
  intersectionCell: HexCell | null;
}

export interface PathSegment {
  id: number;
  fromCell: HexCell;
  toCell: HexCell;
  controlPoint: { x: number; y: number } | null;
  intersections: IntersectionNode[];
}

export interface IntersectionNode {
  x: number;
  y: number;
  pathA: PathSegment;
  pathB: PathSegment;
  rainbowPhase: number;
  chosenDirection: 'A' | 'B' | null;
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
  type: 'click' | 'trail' | 'flow' | 'unlock' | 'pulse' | 'glow';
}

export interface GameSaveState {
  score: number;
  level: number;
  combo: number;
  comboTimer: number;
  unlockedCount: number;
  gridData: { q: number; r: number; symbol: string; isLocked: boolean; isPassable: boolean; activationCount: number }[];
  paths: { fromQ: number; fromR: number; toQ: number; toR: number; cpX: number; cpY: number }[];
  timestamp: number;
}

export interface ReplayFrame {
  time: number;
  type: 'ball_move' | 'activate' | 'unlock' | 'path_create' | 'intersection';
  data: Record<string, unknown>;
}
