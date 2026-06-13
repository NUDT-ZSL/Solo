export const GRID_SIZE = 40;
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 15;
export const PLAYER_SPEED = 3;
export const ENEMY_SPEED = 1.5;
export const SOUND_SPEED = 6;
export const SOUND_MAX_RADIUS = 3;
export const SOUND_DURATION = 0.5;
export const EMP_RADIUS = 2;
export const SIGNAL_DECREASE_RATE = 10;
export const SIGNAL_RECOVERY_RATE = 5;
export const SIGNAL_LOW_THRESHOLD = 20;
export const DEAF_DURATION = 3;
export const DISTRACT_DURATION = 5;
export const PARTICLE_INTERVAL = 0.3;
export const PARTICLE_DURATION = 0.5;
export const FLASH_DURATION = 1.5;
export const SHAKE_AMOUNT = 4;
export const EDGE_RED_DURATION = 0.2;
export const SUCCESS_POPUP_DELAY = 2;
export const FAILED_RETRY_DELAY = 1;

export interface EnemyConfig {
  id: string;
  patrolPath: { x: number; y: number }[];
}

export interface EMPZone {
  x: number;
  y: number;
  radius: number;
}

export interface Level {
  id: number;
  name: string;
  mission: string;
  map: number[][];
  playerStart: { x: number; y: number };
  dataTerminal: { x: number; y: number };
  enemies: EnemyConfig[];
  empZones: EMPZone[];
}

export interface MissionLog {
  levelId: number;
  completedAt: string;
  duration: number;
  signalUsed: number;
  detected: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  direction: number;
  patrolIndex: number;
  patrolPath: Position[];
  distracted: boolean;
  distractedTarget: Position | null;
  distractedTimer: number;
  deaf: boolean;
  deafTimer: number;
  lastParticleTime: number;
  origPatrolIndex: number;
}

export interface SoundWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  startTime: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export type ScreenEffectType =
  | 'flash'
  | 'shake'
  | 'edgeRed'
  | 'successPopup'
  | 'failedOverlay';

export interface ScreenEffect {
  type: ScreenEffectType;
  startTime: number;
  duration: number;
  intensity?: number;
}

export type GameStatus = 'playing' | 'success' | 'failed' | 'transition';

export interface PlayerState {
  x: number;
  y: number;
  signal: number;
  inEMP: boolean;
  opacity: number;
}

export interface GameState {
  level: Level | null;
  player: PlayerState;
  enemies: EnemyState[];
  soundWaves: SoundWave[];
  particles: Particle[];
  effects: ScreenEffect[];
  dataCollected: number;
  status: GameStatus;
  startTime: number;
  currentLevelIndex: number;
  levels: Level[];
  keys: Set<string>;
  lastPlayerGridX: number;
  lastPlayerGridY: number;
  detected: boolean;
  successPopupTimer: number;
}

export interface AICommand {
  enemyId: string;
  targetX: number;
  targetY: number;
}
