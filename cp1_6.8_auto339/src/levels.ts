export interface Vec2 {
  x: number;
  y: number;
}

export interface AsteroidDef {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  textureSeed: number;
}

export interface StarGateDef {
  id: string;
  pos: Vec2;
  radius: number;
  hitCount: number;
  color: string;
}

export interface InterferenceZoneDef {
  pos: Vec2;
  radius: number;
  strength: number;
  direction: Vec2;
}

export interface BlackHoleDef {
  pos: Vec2;
  radius: number;
  pullRadius: number;
  pullStrength: number;
}

export interface StarFragmentDef {
  id: string;
  pos: Vec2;
  radius: number;
  collected: boolean;
}

export interface GravityLineConstraint {
  maxLength: number;
  maxCurvature: number;
  energyCost: number;
}

export interface LevelDef {
  id: number;
  name: string;
  width: number;
  height: number;
  playerPlanet: Vec2;
  asteroids: AsteroidDef[];
  starGates: StarGateDef[];
  interferenceZones: InterferenceZoneDef[];
  blackHoles: BlackHoleDef[];
  starFragments: StarFragmentDef[];
  gravityConstraint: GravityLineConstraint;
  maxEnergy: number;
  energyRegenRate: number;
  nebulae: { pos: Vec2; radius: number; color: string; opacity: number }[];
}

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

export const levels: LevelDef[] = [
  {
    id: 1,
    name: '星尘启程',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    playerPlanet: { x: 200, y: 540 },
    asteroids: [
      { id: 'a1', pos: { x: 400, y: 300 }, vel: { x: 60, y: 20 }, radius: 18, textureSeed: 42 },
      { id: 'a2', pos: { x: 500, y: 700 }, vel: { x: 40, y: -30 }, radius: 22, textureSeed: 73 },
    ],
    starGates: [
      { id: 'g1', pos: { x: 1500, y: 400 }, radius: 40, hitCount: 1, color: '#00e5ff' },
    ],
    interferenceZones: [],
    blackHoles: [],
    starFragments: [
      { id: 'f1', pos: { x: 900, y: 300 }, radius: 12, collected: false },
      { id: 'f2', pos: { x: 1200, y: 650 }, radius: 12, collected: false },
      { id: 'f3', pos: { x: 700, y: 500 }, radius: 12, collected: false },
    ],
    gravityConstraint: { maxLength: 350, maxCurvature: 0.8, energyCost: 20 },
    maxEnergy: 100,
    energyRegenRate: 8,
    nebulae: [
      { pos: { x: 600, y: 400 }, radius: 200, color: '#6a0dad', opacity: 0.08 },
      { pos: { x: 1300, y: 600 }, radius: 150, color: '#1a237e', opacity: 0.06 },
    ],
  },
  {
    id: 2,
    name: '引力暗流',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    playerPlanet: { x: 180, y: 540 },
    asteroids: [
      { id: 'a1', pos: { x: 350, y: 250 }, vel: { x: 50, y: 30 }, radius: 16, textureSeed: 11 },
      { id: 'a2', pos: { x: 400, y: 800 }, vel: { x: 70, y: -20 }, radius: 20, textureSeed: 55 },
      { id: 'a3', pos: { x: 600, y: 500 }, vel: { x: 30, y: 50 }, radius: 14, textureSeed: 99 },
    ],
    starGates: [
      { id: 'g1', pos: { x: 1500, y: 300 }, radius: 38, hitCount: 1, color: '#ff4081' },
      { id: 'g2', pos: { x: 1600, y: 700 }, radius: 38, hitCount: 1, color: '#00e5ff' },
    ],
    interferenceZones: [
      { pos: { x: 900, y: 500 }, radius: 180, strength: 40, direction: { x: 0, y: 1 } },
    ],
    blackHoles: [],
    starFragments: [
      { id: 'f1', pos: { x: 700, y: 200 }, radius: 12, collected: false },
      { id: 'f2', pos: { x: 1100, y: 450 }, radius: 12, collected: false },
      { id: 'f3', pos: { x: 1400, y: 800 }, radius: 12, collected: false },
      { id: 'f4', pos: { x: 500, y: 650 }, radius: 12, collected: false },
    ],
    gravityConstraint: { maxLength: 320, maxCurvature: 0.7, energyCost: 22 },
    maxEnergy: 100,
    energyRegenRate: 7,
    nebulae: [
      { pos: { x: 800, y: 300 }, radius: 250, color: '#4a148c', opacity: 0.07 },
      { pos: { x: 1200, y: 700 }, radius: 180, color: '#0d47a1', opacity: 0.06 },
      { pos: { x: 400, y: 600 }, radius: 120, color: '#880e4f', opacity: 0.05 },
    ],
  },
  {
    id: 3,
    name: '深渊之眼',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    playerPlanet: { x: 160, y: 540 },
    asteroids: [
      { id: 'a1', pos: { x: 350, y: 200 }, vel: { x: 80, y: 40 }, radius: 20, textureSeed: 33 },
      { id: 'a2', pos: { x: 300, y: 800 }, vel: { x: 60, y: -50 }, radius: 24, textureSeed: 77 },
      { id: 'a3', pos: { x: 550, y: 450 }, vel: { x: 45, y: 35 }, radius: 16, textureSeed: 21 },
      { id: 'a4', pos: { x: 650, y: 700 }, vel: { x: 35, y: -45 }, radius: 18, textureSeed: 88 },
    ],
    starGates: [
      { id: 'g1', pos: { x: 1600, y: 250 }, radius: 42, hitCount: 2, color: '#ffab00' },
      { id: 'g2', pos: { x: 1550, y: 800 }, radius: 36, hitCount: 1, color: '#00e5ff' },
    ],
    interferenceZones: [
      { pos: { x: 700, y: 400 }, radius: 200, strength: 50, direction: { x: 1, y: 0.5 } },
      { pos: { x: 1200, y: 650 }, radius: 150, strength: 35, direction: { x: -0.5, y: 1 } },
    ],
    blackHoles: [
      { pos: { x: 960, y: 540 }, radius: 30, pullRadius: 180, pullStrength: 120 },
    ],
    starFragments: [
      { id: 'f1', pos: { x: 500, y: 350 }, radius: 12, collected: false },
      { id: 'f2', pos: { x: 800, y: 200 }, radius: 12, collected: false },
      { id: 'f3', pos: { x: 1350, y: 500 }, radius: 12, collected: false },
      { id: 'f4', pos: { x: 1100, y: 850 }, radius: 12, collected: false },
      { id: 'f5', pos: { x: 450, y: 700 }, radius: 12, collected: false },
    ],
    gravityConstraint: { maxLength: 300, maxCurvature: 0.6, energyCost: 25 },
    maxEnergy: 120,
    energyRegenRate: 6,
    nebulae: [
      { pos: { x: 500, y: 300 }, radius: 200, color: '#311b92', opacity: 0.09 },
      { pos: { x: 1100, y: 500 }, radius: 250, color: '#1a237e', opacity: 0.08 },
      { pos: { x: 1400, y: 300 }, radius: 130, color: '#880e4f', opacity: 0.06 },
    ],
  },
];
