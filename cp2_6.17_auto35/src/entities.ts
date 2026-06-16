export interface Position {
  x: number;
  y: number;
}

export interface Ship extends Position {
  angle: number;
  speed: number;
  health: number;
  energy: number;
  minerals: number;
  score: number;
  propellerAngle: number;
}

export interface Mineral extends Position {
  radius: number;
  pulsePhase: number;
  isCollecting: boolean;
  collectProgress: number;
  id: number;
}

export interface PendingMineral {
  spawnTime: number;
}

export interface Mine extends Position {
  radius: number;
  pulsePhase: number;
  opacity: number;
}

export interface SpaceStation extends Position {
  width: number;
  height: number;
  glowPhase: number;
}

export type ParticleType = 'exhaust' | 'explosion' | 'storm';

export interface Particle extends Position {
  type: ParticleType;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Explosion extends Position {
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export interface GameState {
  ship: Ship;
  minerals: Mineral[];
  pendingMinerals: PendingMineral[];
  mines: Mine[];
  station: SpaceStation;
  particles: Particle[];
  particlePool: Particle[];
  explosions: Explosion[];
  lastMineSpawn: number;
  mineSpawnInterval: number;
  mineSpawnMin: number;
  mineSpawnMax: number;
  difficultyLevel: number;
  mineralPulseSpeed: number;
  stormDensity: number;
  difficultyBoostEnd: number;
  showLowEnergyWarning: boolean;
  warningEndTime: number;
  screenShake: number;
  frameCount: number;
  gameOver: boolean;
  deliveryCount: number;
  currentTime: number;
  mineralNextId: number;
}

export interface UIState {
  health: number;
  minerals: number;
  energy: number;
  score: number;
  showLowEnergyWarning: boolean;
  gameOver: boolean;
  radarData: {
    ship: Position;
    minerals: Position[];
    mines: Position[];
    station: Position;
    scanAngle: number;
  };
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const SHIP_SPEED = 120;
export const SHIP_BASE = 30;
export const SHIP_HEIGHT = 20;
export const SHIP_COLOR = '#4fc3f7';
export const MINERAL_RADIUS = 25;
export const MINERAL_COLOR = '#ffd54f';
export const MINE_RADIUS = 12;
export const MINE_COLOR = '#8e24aa';
export const STATION_BASE = 35;
export const STATION_HEIGHT = 25;
export const STATION_COLOR = '#00e676';
export const EXHAUST_LIFE = 0.6;
export const EXPLOSION_LIFE = 0.4;
export const ENERGY_DRAIN_RATE = 1;
export const COLLECT_DURATION = 0.5;
export const WARNING_DURATION = 2;
export const DIFFICULTY_DURATION = 15;
export const SCREEN_SHAKE_DURATION = 0.3;
export const MINE_SPAWN_MIN = 8;
export const MINE_SPAWN_MAX = 15;
export const MIN_MINE_SPAWN_INTERVAL = 4;
export const MAX_PARTICLES = 300;
export const COLLECT_DISTANCE = 50;
export const STATION_INTERACT_DISTANCE = 60;
export const MINERAL_COUNT_MIN = 3;
export const MINERAL_COUNT_MAX = 5;
export const MINE_SPAWN_COUNT_MIN = 1;
export const MINE_SPAWN_COUNT_MAX = 2;
export const STORM_PARTICLE_BASE_INTERVAL = 30;
export const DIFFICULTY_MINERAL_BONUS = 5;
export const DIFFICULTY_MINE_REDUCTION = 1;
export const DIFFICULTY_PULSE_BOOST = 0.1;
export const DIFFICULTY_STORM_BOOST = 0.2;
export const SCORE_PER_MINERAL = 10;
export const MINE_DAMAGE = 20;
export const SCREEN_SHAKE_INTENSITY = 2;
export const RADAR_SIZE = 150;
export const RADAR_REFRESH_INTERVAL = 5;
export const RADAR_SCAN_PERIOD = 1;
export const MINERAL_RESPAWN_DELAY = 5;
export const MINERAL_OVERLAP_DISTANCE = 80;
export const STATION_GLOW_RADIUS = 50;
