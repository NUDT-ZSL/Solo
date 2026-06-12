export const GAME_WIDTH = 500;
export const GAME_HEIGHT = 500;
export const TILE_SIZE = 16;
export const MAP_COLS = Math.ceil(GAME_WIDTH / TILE_SIZE);
export const MAP_ROWS = Math.ceil(GAME_HEIGHT / TILE_SIZE);

export const PLAYER_SIZE = 32;
export const PLAYER_SPEED = 120;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_RUN_FRAME_DURATION = 200;

export const MONSTER_SIZE = 24;
export const MONSTER_SPEED = 60;
export const MONSTER_DIRECTION_CHANGE_INTERVAL = 2000;
export const MONSTER_STEALTH_INTERVAL = 5000;
export const MONSTER_STEALTH_DURATION = 2000;
export const MONSTER_STEALTH_FADE_DURATION = 400;
export const MONSTER_FOOTPRINT_INTERVAL = 1000;
export const MONSTER_FOOTPRINT_DURATION = 3000;
export const MONSTER_FLASH_INTERVAL = 500;
export const MONSTER_FLASH_DURATION = 30;
export const MONSTER_MAX_HEALTH = 30;
export const MONSTER_DAMAGE = 10;
export const MONSTER_ATTACK_COOLDOWN = 1000;

export const CHASE_RANGE = 40;
export const ATTACK_RANGE = 40;
export const ATTACK_ANGLE = Math.PI / 4;
export const ATTACK_DURATION = 150;
export const ATTACK_COOLDOWN = 300;
export const ATTACK_DAMAGE = 10;

export const TERRAIN = {
  GRASS: 0,
  MUD: 1,
  WATER: 2
} as const;

export const TERRAIN_SPEED_MODIFIER = {
  [TERRAIN.GRASS]: 1.0,
  [TERRAIN.MUD]: 0.5,
  [TERRAIN.WATER]: 0.0
} as const;

export const COLORS = {
  GRASS_LIGHT: 0x3a7d2a,
  GRASS_DARK: 0x2d5c1f,
  MUD_LIGHT: 0x5c4033,
  MUD_DARK: 0x3d2b1f,
  WATER_LIGHT: 0x3d5c6e,
  WATER_DARK: 0x2a4050,
  PLAYER: 0xf0e68c,
  PLAYER_OUTLINE: 0x8b7355,
  MONSTER: 0x8b0000,
  MONSTER_OUTLINE: 0x4a0000,
  UI_BG: 0x1a1a1a,
  UI_BORDER: 0xf0e68c,
  UI_TEXT: 0xf0e68c,
  HEALTH_FILL: 0xff3333,
  HEALTH_BG: 0x4a1a1a,
  SKILL_READY: 0xf0e68c,
  SKILL_COOLDOWN: 0x666666,
  FOOTPRINT: 0x3d2b1f,
  SPLASH: 0x8b7355
} as const;

export const LIGHT_RADIUS = 120;
export const LIGHT_MASK_COLOR = 0x000000;

export const MUD_SPLASH_DURATION = 300;
export const MUD_SPLASH_PARTICLES = 5;

export const SCORE_PER_KILL = 100;
