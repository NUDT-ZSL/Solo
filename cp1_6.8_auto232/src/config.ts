export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const COLORS = {
  bgTop: 0x000000,
  bgBottom: 0x0a0a2e,
  starTrailStart: 0x6a0dad,
  starTrailEnd: 0xc0c0c0,
  waveColor: 0x00ccff,
  waveGlow: 0x0088ff,
  portalInactive: 0x334455,
  portalActive: 0x00ffaa,
  uiText: 0xccddff,
  uiPanel: 0x0a0a2e,
};

export const PLANET_COLORS = [
  { fill: 0xff6644, glow: 0xff4422, name: 'mars' },
  { fill: 0x44aaff, glow: 0x2288ff, name: 'neptune' },
  { fill: 0xffcc44, glow: 0xffaa22, name: 'saturn' },
  { fill: 0xaa66ff, glow: 0x8844ff, name: 'pluto' },
  { fill: 0x44ffaa, glow: 0x22ff88, name: 'uranus' },
];

export interface PlanetConfig {
  x: number;
  y: number;
  radius: number;
  colorIndex: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
}

export interface PortalConfig {
  x: number;
  y: number;
  radius: number;
}

export interface WaveOriginConfig {
  x: number;
  y: number;
}

export interface StarTrailConfig {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  pointCount: number;
  speed: number;
  colorStart: number;
  colorEnd: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  maxSteps: number;
  waveOrigin: WaveOriginConfig;
  planets: PlanetConfig[];
  portals: PortalConfig[];
  starTrails: StarTrailConfig[];
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '启程之轨',
    maxSteps: 5,
    waveOrigin: { x: 150, y: 360 },
    planets: [
      { x: 500, y: 300, radius: 40, colorIndex: 0, orbitRadius: 0, orbitSpeed: 0, orbitOffset: 0 },
      { x: 700, y: 450, radius: 35, colorIndex: 1, orbitRadius: 0, orbitSpeed: 0, orbitOffset: 0 },
    ],
    portals: [
      { x: 1050, y: 360, radius: 30 },
    ],
    starTrails: [
      { centerX: 500, centerY: 300, radiusX: 120, radiusY: 80, rotation: 0.3, pointCount: 60, speed: 0.002, colorStart: 0x6a0dad, colorEnd: 0xc0c0c0 },
      { centerX: 700, centerY: 450, radiusX: 100, radiusY: 70, rotation: -0.5, pointCount: 50, speed: -0.0015, colorStart: 0x4488ff, colorEnd: 0xddddff },
    ],
  },
  {
    id: 2,
    name: '双星共鸣',
    maxSteps: 6,
    waveOrigin: { x: 150, y: 360 },
    planets: [
      { x: 400, y: 250, radius: 35, colorIndex: 2, orbitRadius: 15, orbitSpeed: 0.5, orbitOffset: 0 },
      { x: 600, y: 500, radius: 40, colorIndex: 3, orbitRadius: 20, orbitSpeed: -0.3, orbitOffset: Math.PI },
      { x: 850, y: 300, radius: 30, colorIndex: 4, orbitRadius: 0, orbitSpeed: 0, orbitOffset: 0 },
    ],
    portals: [
      { x: 1100, y: 250, radius: 30 },
      { x: 1100, y: 480, radius: 30 },
    ],
    starTrails: [
      { centerX: 400, centerY: 250, radiusX: 100, radiusY: 60, rotation: 0.8, pointCount: 50, speed: 0.003, colorStart: 0xffcc44, colorEnd: 0xffffff },
      { centerX: 600, centerY: 500, radiusX: 130, radiusY: 90, rotation: -0.2, pointCount: 60, speed: -0.002, colorStart: 0x8844ff, colorEnd: 0xddccff },
      { centerX: 850, centerY: 300, radiusX: 90, radiusY: 70, rotation: 1.2, pointCount: 45, speed: 0.0025, colorStart: 0x44ffaa, colorEnd: 0xccffdd },
    ],
  },
  {
    id: 3,
    name: '引力漩涡',
    maxSteps: 7,
    waveOrigin: { x: 120, y: 360 },
    planets: [
      { x: 350, y: 200, radius: 30, colorIndex: 1, orbitRadius: 20, orbitSpeed: 0.8, orbitOffset: 0 },
      { x: 550, y: 400, radius: 45, colorIndex: 0, orbitRadius: 0, orbitSpeed: 0, orbitOffset: 0 },
      { x: 750, y: 250, radius: 35, colorIndex: 3, orbitRadius: 25, orbitSpeed: -0.6, orbitOffset: 1.5 },
      { x: 900, y: 500, radius: 30, colorIndex: 4, orbitRadius: 15, orbitSpeed: 0.4, orbitOffset: 3.0 },
    ],
    portals: [
      { x: 1100, y: 200, radius: 28 },
      { x: 1100, y: 520, radius: 28 },
    ],
    starTrails: [
      { centerX: 350, centerY: 200, radiusX: 90, radiusY: 60, rotation: 0.5, pointCount: 45, speed: 0.004, colorStart: 0x4488ff, colorEnd: 0xeeeeff },
      { centerX: 550, centerY: 400, radiusX: 140, radiusY: 100, rotation: -0.3, pointCount: 70, speed: -0.001, colorStart: 0xff4422, colorEnd: 0xffddcc },
      { centerX: 750, centerY: 250, radiusX: 110, radiusY: 80, rotation: 1.0, pointCount: 55, speed: 0.003, colorStart: 0x8844ff, colorEnd: 0xddbbff },
      { centerX: 900, centerY: 500, radiusX: 85, radiusY: 65, rotation: -0.7, pointCount: 40, speed: -0.0025, colorStart: 0x44ffaa, colorEnd: 0xccffee },
    ],
  },
];

export const DEFLECTION_BASE_ANGLE = 0.4;
export const WAVE_BASE_SPEED = 400;
export const WAVE_RADIUS = 8;
export const PLANET_INFLUENCE_RANGE = 150;
export const PORTAL_ACTIVATION_RADIUS = 40;
