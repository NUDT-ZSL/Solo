export interface PlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  score: number;
  connected: boolean;
  isJumping: boolean;
  isSprinting: boolean;
  facingRight: boolean;
  spawnTime: number;
}

export interface GemState {
  id: string;
  x: number;
  y: number;
  spawnTime: number;
}

export interface ServerState {
  players: Record<string, PlayerState>;
  gems: GemState[];
  timestamp: number;
}

export interface PlayerInput {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  shift: boolean;
  space: boolean;
  timestamp: number;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GROUND_Y = 568;
export const PLAYER_SIZE = 32;
export const MOVE_SPEED = 150;
export const SPRINT_MULTIPLIER = 1.5;
export const JUMP_VELOCITY = -400;
export const GRAVITY = 800;
export const GEM_RADIUS = 12;
export const GEM_COLLECT_DIST = 20;
export const SERVER_TICK_MS = 50;
export const GEM_SPAWN_INTERVAL_MS = 5000;
export const MAX_PLAYERS = 6;
export const MAX_GEMS = 10;
export const INTERP_FACTOR = 0.2;
export const SERVER_TICK_INTERVAL = 0.05;
export const INTERP_MIN = 0.1;
export const INTERP_MAX = 1.0;
export const INTERP_TIME_BASE = 0.05;

export const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export const PLAYER_NAMES = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
  'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet',
  'Kilo', 'Lima', 'Mike', 'November', 'Oscar'
];
