export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const COLORS = {
  bgTop: 0x0a0a2e,
  bgBottom: 0x000510,
  wallFill: 0x0d1b3e,
  wallStroke: 0x1a3a7a,
  waterBlue: 0x4488ff,
  waterPurple: 0x8844cc,
  waterCyan: 0x22ccaa,
  waterGreen: 0x44dd88,
  playerCore: 0xffffff,
  playerGlow: 0x66ccff,
  playerTrail: 0x44aaee,
  fragmentCore: 0xffdd44,
  fragmentGlow: 0xffaa22,
  vortexCore: 0x8822aa,
  vortexRing: 0xaa44dd,
  undercurrent: 0x2266aa,
  exitLocked: 0x555566,
  exitUnlocked: 0x44ffaa,
  particleBurst: [0xff4488, 0x44ffaa, 0xffdd44, 0x4488ff, 0xff8844],
  pulseDamage: 0xff2244,
};

export const PLAYER = {
  radius: 12,
  speed: 200,
  maxLives: 3,
  invincibleDuration: 1500,
  trailLifespan: 400,
  trailQuantity: 2,
  trailScale: { start: 0.6, end: 0 },
  trailAlpha: { start: 0.8, end: 0 },
};

export const FRAGMENT = {
  radius: 10,
  requiredCount: 3,
  pulseSpeed: 800,
  burstQuantity: 30,
  burstLifespan: 600,
  burstSpeed: { min: 60, max: 200 },
  burstScale: { start: 0.5, end: 0 },
};

export const WATER_FLOW = {
  lineCount: 5,
  lineWidth: 2,
  speed: { min: 30, max: 80 },
  directionChangeInterval: 5000,
  alpha: 0.4,
};

export const VORTEX = {
  radiusMin: 18,
  radiusMax: 30,
  rotationSpeed: 120,
  pullStrength: 40,
  ringCount: 3,
};

export const UNDERCURRENT = {
  width: 20,
  lengthMin: 60,
  lengthMax: 160,
  speedMin: 50,
  speedMax: 120,
  directionChangeInterval: 4000,
};

export interface LevelConfig {
  mazeCols: number;
  mazeRows: number;
  cellSize: number;
  vortexCount: number;
  undercurrentCount: number;
  fragmentCount: number;
  waterSpeedMult: number;
  trapSpeedMult: number;
}

export const LEVELS: LevelConfig[] = [
  { mazeCols: 8, mazeRows: 6, cellSize: 70, vortexCount: 2, undercurrentCount: 1, fragmentCount: 3, waterSpeedMult: 0.8, trapSpeedMult: 0.7 },
  { mazeCols: 9, mazeRows: 6, cellSize: 65, vortexCount: 3, undercurrentCount: 2, fragmentCount: 3, waterSpeedMult: 1.0, trapSpeedMult: 1.0 },
  { mazeCols: 10, mazeRows: 7, cellSize: 60, vortexCount: 4, undercurrentCount: 3, fragmentCount: 3, waterSpeedMult: 1.2, trapSpeedMult: 1.2 },
  { mazeCols: 11, mazeRows: 7, cellSize: 55, vortexCount: 5, undercurrentCount: 4, fragmentCount: 3, waterSpeedMult: 1.4, trapSpeedMult: 1.5 },
  { mazeCols: 12, mazeRows: 8, cellSize: 50, vortexCount: 6, undercurrentCount: 5, fragmentCount: 3, waterSpeedMult: 1.6, trapSpeedMult: 1.8 },
];

export const TRANSITION = {
  fadeDuration: 800,
  fadeColor: 0x000000,
};

export const UI = {
  fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
  fontSizeLarge: '28px',
  fontSizeMedium: '20px',
  fontSizeSmall: '16px',
  panelAlpha: 0.35,
  panelRadius: 12,
  panelPadding: 16,
};
