export enum Polarity {
  Positive = 1,
  Negative = -1,
}

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const GRAVITY = 1800;

export const PLAYER_RADIUS = 18;
export const PLAYER_START_X = 200;
export const PLAYER_START_Y = 400;

export const SEGMENT_WIDTH = 80;
export const SEGMENT_HEIGHT = 30;
export const SEGMENT_GAP_MIN = 20;
export const SEGMENT_GAP_MAX = 60;

export const TRACK_Y_MIN = 380;
export const TRACK_Y_MAX = 520;

export const BASE_SCROLL_SPEED = 200;

export const JUMP_VELOCITY = -600;

export const ATTRACT_STICK_DURATION = 400;
export const ATTRACT_BOOST_SPEED = 120;

export const REPEL_BOUNCE_VELOCITY = -500;

export const POLARITY_SWITCH_COOLDOWN = 200;

export const OBSTACLE_SPAWN_CHANCE_BASE = 0.15;
export const TRAP_SPAWN_CHANCE_BASE = 0.1;
export const BOOST_SPAWN_CHANCE_BASE = 0.08;

export const OBSTACLE_HEIGHT = 40;
export const OBSTACLE_WIDTH = 20;

export const DIFFICULTY_INTERVAL = 100;

export const LIGHTNING_INTERVAL_MIN = 3000;
export const LIGHTNING_INTERVAL_MAX = 8000;

export const COLORS = {
  BG_TOP: 0x1a1a2e,
  BG_BOTTOM: 0x0a0a0f,
  POSITIVE_PRIMARY: 0x6c5ce7,
  POSITIVE_GLOW: 0xa29bfe,
  NEGATIVE_PRIMARY: 0xe17055,
  NEGATIVE_GLOW: 0xff7675,
  PLAYER_POSITIVE: 0x74b9ff,
  PLAYER_NEGATIVE: 0xff7675,
  PLAYER_GLOW: 0xdfe6e9,
  OBSTACLE: 0xff0000,
  OBSTACLE_GLOW: 0xff4444,
  BOOST: 0x00ff88,
  TRAP: 0xff0066,
  LIGHTNING: 0xe0e0ff,
  UI_TEXT: 0xecf0f1,
  UI_DIM: 0x636e72,
};

export function getScrollSpeed(distance: number): number {
  const level = Math.floor(distance / DIFFICULTY_INTERVAL);
  return BASE_SCROLL_SPEED + level * 25;
}

export function getGapSize(distance: number): number {
  const level = Math.floor(distance / DIFFICULTY_INTERVAL);
  return Math.min(SEGMENT_GAP_MAX + level * 5, 140);
}

export function getObstacleChance(distance: number): number {
  const level = Math.floor(distance / DIFFICULTY_INTERVAL);
  return Math.min(OBSTACLE_SPAWN_CHANCE_BASE + level * 0.03, 0.45);
}

export function getTrapChance(distance: number): number {
  const level = Math.floor(distance / DIFFICULTY_INTERVAL);
  return Math.min(TRAP_SPAWN_CHANCE_BASE + level * 0.02, 0.35);
}

export function getBoostChance(distance: number): number {
  const level = Math.floor(distance / DIFFICULTY_INTERVAL);
  return Math.max(BOOST_SPAWN_CHANCE_BASE - level * 0.005, 0.03);
}

export function getTrackYVariation(distance: number): number {
  const level = Math.floor(distance / DIFFICULTY_INTERVAL);
  return Math.min(30 + level * 8, 120);
}
