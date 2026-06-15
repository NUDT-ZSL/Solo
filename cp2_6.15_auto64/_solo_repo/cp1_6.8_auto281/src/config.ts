export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;

export const COLORS = {
  skyTop: 0xc8d8f0,
  skyBottom: 0xd8c0e8,
  islandBase: 0x7cb87c,
  islandEdge: 0x5a9a5a,
  islandShadow: 0x3a6a3a,
  goldWarm: 0xffd700,
  goldCool: 0xfff8e0,
  whiteCold: 0xf0f4ff,
  bridgeGlow: 0xffeebb,
  bridgeLine: 0xddcc88,
  dustParticle: 0xfff0c0,
  uiGlow: 0xffd700,
  uiGlass: 0x2a2040,
  uiGlassAlpha: 0.55,
  uiDisabled: 0x666688,
  textPrimary: 0xfff8e0,
  textShadow: 0x1a1225,
  handDrawn: 0x4a3a2a,
};

export const ISLAND = {
  radiusX: 200,
  radiusY: 120,
  centerX: GAME_WIDTH / 2,
  centerY: GAME_HEIGHT / 2 + 40,
  rotationSpeed: 0.0003,
  depthBase: 0.05,
};

export const LIGHT_POINT = {
  spawnInterval: 800,
  spawnIntervalBoosted: 640,
  fallSpeedMin: 40,
  fallSpeedMax: 80,
  driftSpeed: 20,
  radius: 8,
  trailLength: 6,
  clickRadius: 30,
  particleBurstCount: 12,
  boostDuration: 10000,
  boostMultiplier: 0.8,
};

export interface BuildingDef {
  key: string;
  name: string;
  cost: number;
  width: number;
  height: number;
  color: number;
  roofColor: number;
  glowColor: number;
  iconChar: string;
}

export const BUILDINGS: BuildingDef[] = [
  {
    key: 'treehouse',
    name: '树屋',
    cost: 10,
    width: 48,
    height: 64,
    color: 0x8b6b3e,
    roofColor: 0x5a8a3e,
    glowColor: 0xaaffaa,
    iconChar: '🌳',
  },
  {
    key: 'windmill',
    name: '风车',
    cost: 20,
    width: 44,
    height: 72,
    color: 0xd4c4a0,
    roofColor: 0xb8a878,
    glowColor: 0xffeecc,
    iconChar: '🌬',
  },
  {
    key: 'lighthouse',
    name: '灯塔',
    cost: 30,
    width: 36,
    height: 88,
    color: 0xf0e8d8,
    roofColor: 0xffd700,
    glowColor: 0xffffaa,
    iconChar: '🗼',
  },
];

export const BRIDGE = {
  maxDistance: 250,
  width: 4,
  glowWidth: 14,
  particleCount: 8,
  particleSpeed: 30,
  flowInterval: 400,
};

export const ISLAND_GROWTH = {
  buildingsNeeded: 5,
  shakeDuration: 600,
  shakeIntensity: 4,
  ringExpandDuration: 1500,
  ringMaxRadius: 300,
  ringColor: 0xffd700,
};

export const UI = {
  hudHeight: 56,
  wheelRadius: 64,
  wheelExpandedRadius: 110,
  cardSize: 52,
  cardGap: 6,
  animDuration: 250,
  numberGlowColor: '#ffd700',
  numberGlowBlur: 12,
  shakeDuration: 200,
  shakeIntensity: 3,
};

export const CLOUD = {
  count: 5,
  speedMin: 8,
  speedMax: 18,
  alphaMin: 0.08,
  alphaMax: 0.2,
  widthMin: 120,
  widthMax: 260,
  heightMin: 40,
  heightMax: 80,
};
