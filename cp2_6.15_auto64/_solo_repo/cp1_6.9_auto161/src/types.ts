export type CrystalColor = 'red' | 'blue' | 'yellow';

export const GRID_SIZE = 8;
export const CELL_SIZE = 64;
export const GRID_PADDING = 16;
export const CRYSTAL_ENERGY_HATCH = 20;
export const SPRITE_ENERGY_RAGE = 40;
export const SPRITE_RAGE_DURATION = 5000;
export const RESONANCE_DURATION = 300;
export const RESONANCE_ENERGY_GAIN = 1;
export const ENERGY_POINT_DURATION = 8000;
export const ENERGY_POINT_SPAWN_INTERVAL = 5000;
export const SPRITE_MOVE_INTERVAL = 1500;
export const SPRITE_RAGE_MOVE_INTERVAL = 750;
export const CRYSTAL_PLACE_ANIM_DURATION = 200;
export const CRYSTAL_GLOW_DURATION = 500;
export const MAX_PARTICLES = 800;

export const COLOR_HEX: Record<CrystalColor, string> = {
  red: '#ff3355',
  blue: '#33aaff',
  yellow: '#ffdd33'
};

export const COLOR_RGB: Record<CrystalColor, { r: number; g: number; b: number }> = {
  red: { r: 255, g: 51, b: 85 },
  blue: { r: 51, g: 170, b: 255 },
  yellow: { r: 255, g: 221, b: 51 }
};

export const HOSTILE_PAIRS: Record<CrystalColor, CrystalColor> = {
  red: 'blue',
  blue: 'yellow',
  yellow: 'red'
};

export interface Position {
  x: number;
  y: number;
}

export interface GridCell {
  row: number;
  col: number;
  crystal: Crystal | null;
  energyPoint: EnergyPoint | null;
}

export interface Crystal {
  id: number;
  color: CrystalColor;
  row: number;
  col: number;
  energy: number;
  placedAt: number;
  glowUntil: number;
  resonanceUntil: number;
  resonancePartners: number[];
}

export type SpriteState = 'normal' | 'rage';

export interface Sprite {
  id: number;
  color: CrystalColor;
  row: number;
  col: number;
  energy: number;
  state: SpriteState;
  moveTimer: number;
  moveInterval: number;
  rageUntil: number;
  flashUntil: number;
  trail: TrailPoint[];
  bobPhase: number;
  auraPhase: number;
}

export interface TrailPoint {
  row: number;
  col: number;
  time: number;
}

export interface EnergyPoint {
  id: number;
  row: number;
  col: number;
  spawnedAt: number;
  expiresAt: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'trail' | 'debris' | 'halo';
  angle?: number;
  radius?: number;
}

export interface ResonanceLine {
  id: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  expiresAt: number;
  color: CrystalColor;
}

export interface ScreenShake {
  active: boolean;
  until: number;
  intensity: number;
}

export interface GameStats {
  crystalCount: number;
  spriteCount: number;
  topSpriteEnergy: number;
  topSpriteState: SpriteState;
  topSpriteColor: CrystalColor | null;
}

export interface RenderData {
  grid: GridCell[][];
  crystals: Crystal[];
  sprites: Sprite[];
  energyPoints: EnergyPoint[];
  particles: Particle[];
  resonanceLines: ResonanceLine[];
  screenShake: ScreenShake;
  stats: GameStats;
  now: number;
}
