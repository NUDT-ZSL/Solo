export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 720;

export const SPEED_TIERS = [
  { minScore: 0, speed: 3 },
  { minScore: 10, speed: 3.8 },
  { minScore: 25, speed: 4.5 },
  { minScore: 50, speed: 5.2 },
  { minScore: 80, speed: 6 },
  { minScore: 120, speed: 7 },
  { minScore: 170, speed: 8 },
  { minScore: 230, speed: 9 },
];

export const BIRD_GRAVITY = 0.35;
export const BIRD_FLAP_FORCE = -6.5;
export const BIRD_X = 80;

export const OBSTACLE_SPAWN_MIN = 1200;
export const OBSTACLE_SPAWN_MAX = 2200;
export const LIGHTPOINT_SPAWN_MIN = 400;
export const LIGHTPOINT_SPAWN_MAX = 800;

export const SKINS = [
  { name: '星辉', color: 0xffd700, trail: 0xffec80, unlockAt: 0 },
  { name: '冰蓝', color: 0x00d4ff, trail: 0x80eaff, unlockAt: 50 },
  { name: '樱粉', color: 0xff69b4, trail: 0xffb3d9, unlockAt: 100 },
  { name: '翠绿', color: 0x00ff88, trail: 0x80ffc4, unlockAt: 150 },
  { name: '紫焰', color: 0xbf5fff, trail: 0xdfa0ff, unlockAt: 200 },
  { name: '赤焰', color: 0xff4444, trail: 0xff8888, unlockAt: 300 },
];

export const BG_COLOR_TOP = 0x87ceeb;
export const BG_COLOR_BOTTOM = 0xc8a2d4;

export const STORAGE_KEY_HIGHSCORE = 'lightwing_highscore';
export const STORAGE_KEY_LIGHTPOINTS = 'lightwing_lightpoints';
