export enum CellType {
  WATER = 0,
  WALL = 1,
  MINERAL = 2,
  REEF = 3,
  EXIT = 4,
  START = 5
}

export enum MineralType {
  SPHALERITE = 'sphalerite',
  KYANITE = 'kyanite',
  EMERALD = 'emerald'
}

export const MINERAL_COLORS: Record<MineralType, string> = {
  [MineralType.SPHALERITE]: '#a855f7',
  [MineralType.KYANITE]: '#3b82f6',
  [MineralType.EMERALD]: '#22c55e'
};

export const MINERAL_NAMES: Record<MineralType, string> = {
  [MineralType.SPHALERITE]: '闪锌矿',
  [MineralType.KYANITE]: '蓝晶石',
  [MineralType.EMERALD]: '祖母绿'
};

export interface Cell {
  type: CellType;
  mineralType?: MineralType;
  noiseVal: number;
}

export type Grid = Cell[][];

export interface Position {
  x: number;
  y: number;
}

export interface SubmarineState {
  x: number;
  y: number;
  rotation: number;
  velocity: { x: number; y: number };
  speed: number;
  baseSpeed: number;
  oxygen: number;
  maxOxygen: number;
  energy: number;
  maxEnergy: number;
  slowEffect: number;
  slowTimer: number;
}

export interface Upgrades {
  speed: number;
  sonarRange: number;
  energyEfficiency: number;
}

export interface Minerals {
  sphalerite: number;
  kyanite: number;
  emerald: number;
}

export interface SonarPulse {
  active: boolean;
  x: number;
  y: number;
  currentRadius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
  highlightedCells: Set<string>;
}

export interface AICreature {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'jellyfish' | 'shark';
  stunned: number;
  targetX: number;
  targetY: number;
}

export interface ScreenShake {
  active: boolean;
  amplitude: number;
  frequency: number;
  duration: number;
  startTime: number;
}

export interface OxygenFlash {
  active: boolean;
  startTime: number;
  duration: number;
  blinkCount: number;
}

export interface GameState {
  grid: Grid;
  explored: boolean[][];
  submarine: SubmarineState;
  upgrades: Upgrades;
  minerals: Minerals;
  sonar: SonarPulse;
  sonarCooldown: number;
  creatures: AICreature[];
  nextCreatureTime: number;
  screenShake: ScreenShake;
  oxygenFlash: OxygenFlash;
  level: number;
  levelStartTime: number;
  paused: boolean;
  gameOver: boolean;
  atExit: boolean;
  showUpgrade: boolean;
  particles: Particle[];
  width: number;
  height: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'sonar' | 'wake' | 'mineral';
}

export const GRID_SIZE = 35;
export const BASE_SPEED = 3;
export const BASE_SONAR_RADIUS = 8;
export const BASE_SONAR_DURATION = 0.6;
export const BASE_SONAR_COOLDOWN = 3;
export const UPGRADED_SONAR_COOLDOWN = 1.5;
export const MAX_CREATURES = 3;
export const MAX_SONAR_PARTICLES = 200;
export const CREATURE_SPEED = 1.5;
export const CREATURE_OXYGEN_DAMAGE = 15;
export const SPEED_UPGRADE_COST = { sphalerite: 3, kyanite: 0, emerald: 0 };
export const SONAR_UPGRADE_COST = { sphalerite: 0, kyanite: 2, emerald: 0 };
export const ENERGY_UPGRADE_COST = { sphalerite: 0, kyanite: 0, emerald: 2 };
