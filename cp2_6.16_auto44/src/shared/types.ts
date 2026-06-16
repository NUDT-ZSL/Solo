export type ArrowDirection = 'up' | 'down' | 'left' | 'right';

export type Player = 'player1' | 'player2';

export interface Arrow {
  id: string;
  direction: ArrowDirection;
  player: Player;
  y: number;
  speed: number;
  hit: boolean;
  missed: boolean;
  hitResult?: 'perfect' | 'good' | 'miss';
}

export interface PlayerState {
  id: string;
  player: Player;
  health: number;
  maxHealth: number;
  combo: number;
  maxCombo: number;
  isHit: boolean;
  isSpecialAttacking: boolean;
  connected: boolean;
  ready: boolean;
}

export type GamePhase = 'waiting' | 'playing' | 'finished';

export interface GameState {
  phase: GamePhase;
  player1: PlayerState;
  player2: PlayerState;
  arrows: Arrow[];
  timeRemaining: number;
  currentDifficulty: number;
  winner: Player | null;
  screenShake: boolean;
  fullscreenFlash: boolean;
}

export interface WSMessage {
  type: 'player_ready' | 'input' | 'game_state' | 'match_found' | 'game_over' | 'start_game' | 'reset_game';
  payload: any;
}

export const PLAYER1_KEYS: Record<string, ArrowDirection> = {
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

export const PLAYER2_KEYS: Record<string, ArrowDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export const GAME_CONFIG = {
  GAME_DURATION: 60,
  TRACK_HEIGHT: 600,
  JUDGE_LINE_Y: 100,
  BASE_SPEED: 200,
  BASE_BPM: 120,
  MAX_HEALTH: 100,
  HIT_DAMAGE: 5,
  MISS_DAMAGE: 8,
  SPECIAL_DAMAGE: 15,
  SPECIAL_COMBO_THRESHOLD: 10,
  DIFFICULTY_INTERVALS: [800, 500, 300],
  PERFECT_WINDOW: 50,
  GOOD_WINDOW: 100,
  MISS_WINDOW: 150,
  ARROW_START_Y: 600,
};

export const DIRECTIONS: ArrowDirection[] = ['up', 'down', 'left', 'right'];
