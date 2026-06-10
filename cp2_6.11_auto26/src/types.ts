export enum CellType {
  EMPTY = 0,
  SPIRIT = 1,
  THORN = 2,
}

export enum FogState {
  FULL = 0,
  FADING = 1,
  CLEAR = 2,
  RETURNING = 3,
}

export enum PlayerSide {
  GREEN = 0,
  AMBER = 1,
}

export enum GamePhase {
  TURN_TRANSITION = 0,
  PLAYER_TURN = 1,
  AI_THINKING = 2,
  GAME_OVER = 3,
}

export enum CaptureState {
  IDLE = 0,
  CAPTURING = 1,
  CAPTURED = 2,
  DECAYING = 3,
}

export interface Cell {
  type: CellType;
  fogState: FogState;
  fogAlpha: number;
  owner: PlayerSide | null;
  captureProgress: number;
  captureState: CaptureState;
  captureSide: PlayerSide | null;
  pulsePhase: number;
}

export interface Piece {
  side: PlayerSide;
  row: number;
  col: number;
  entangled: number;
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

export interface ButtonDef {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  enabled: boolean;
  action: string;
}

export interface GameState {
  board: Cell[][];
  pieces: Piece[];
  currentSide: PlayerSide;
  turn: number;
  maxTurns: number;
  mana: [number, number];
  scores: [number, number];
  turnTimer: number;
  turnStartTime: number;
  selectedPiece: Piece | null;
  selectedCell: { row: number; col: number } | null;
  phase: GamePhase;
  transitionAlpha: number;
  transitionTimer: number;
  particles: Particle[];
  summonAnim: { row: number; col: number; progress: number } | null;
  vineAnim: { row: number; col: number; progress: number } | null;
  aiActionQueue: AiAction[];
  aiActionDelay: number;
  gameOverShown: boolean;
  winner: PlayerSide | null;
  hoveredButton: string | null;
  buttonClickAnim: { action: string; progress: number } | null;
  runeAngle: number;
  vineCastingMode: boolean;
}

export interface AiAction {
  type: 'move' | 'summon' | 'vine' | 'endTurn';
  piece?: Piece;
  targetRow?: number;
  targetCol?: number;
  targetPiece?: Piece;
}

export const BOARD_SIZE = 8;
export const CELL_SIZE = 70;
export const CELL_GAP = 2;
export const BOARD_OFFSET_X = 0;
export const BOARD_OFFSET_Y = 0;

export const COLORS = {
  bg1: '#0B1A10',
  bg2: '#0D2B20',
  border: '#2C1810',
  green: '#3CB371',
  amber: '#FFB347',
  gold: '#FFD700',
  lightGreen: '#A8E6CF',
  fogDark: '#1A2A1A',
  fogMid: '#2A3A2A',
  spiritPulse: '#4AE68A',
  vineGreen: '#2ECC71',
  thornDark: '#3D1F0B',
};

export const FOG_FADE_DURATION = 500;
export const FOG_RETURN_DURATION = 250;
export const SPIRIT_PULSE_PERIOD = 1500;
export const CAPTURE_DURATION = 3000;
export const CAPTURE_DECAY_DURATION = 4500;
export const SUMMON_ANIM_DURATION = 600;
export const VINE_ANIM_DURATION = 800;
export const TURN_TRANSITION_DURATION = 1200;
export const TURN_TIME_LIMIT = 30;
export const MAX_MANA = 5;
export const SUMMON_MANA_COST = 2;
export const VINE_MANA_COST = 3;
export const MAX_TURNS = 20;
export const SELECT_HALO_PERIOD = 1500;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
