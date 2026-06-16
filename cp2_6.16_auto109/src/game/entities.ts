export type TerrainType = 'land' | 'shallow' | 'deep';

export type BuildingType = 'seawall' | 'watchtower' | 'plantation';

export type TidePhase = 'rising' | 'falling';

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  waterLevel: number;
  delayedWaterLevel: number;
  tideDelay: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  isDamaged: boolean;
  damageTimer: number;
  hasShield: boolean;
  shieldTimer: number;
  lastProduction: number;
}

export interface Seaweed {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  collectAnimation: number;
  respawnTimer: number;
  spawnAnimation: number;
}

export interface TideBeast {
  id: number;
  x: number;
  y: number;
  radius: number;
  targetX: number;
  targetY: number;
  speed: number;
  dying: boolean;
  deathAnimation: number;
}

export interface GameState {
  score: number;
  energy: number;
  tideLevel: number;
  tidePhase: TidePhase;
  tideTimer: number;
  cycleCount: number;
  buildingsBuilt: number;
  destroyedBuildings: number;
  gameOver: boolean;
  selectedBuilding: BuildingType | null;
  warningActive: boolean;
}

export interface BuildingConfig {
  cost: number;
  name: string;
  description: string;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  seawall: { cost: 10, name: '防波堤', description: '阻挡相邻3格水位上升，延迟2秒' },
  watchtower: { cost: 15, name: '瞭望塔', description: '潮汐到来前5秒预警闪烁' },
  plantation: { cost: 20, name: '种植园', description: '每5秒自动产出2点食物能量' },
};

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const TILE_SIZE = 60;
export const MAP_WIDTH = 8;
export const MAP_HEIGHT = 8;
export const TIDE_CYCLE = 30;
export const TIDE_RISE_TIME = 15;
export const TIDE_FALL_TIME = 15;
export const TIDE_MAX_LEVEL = 8;
export const MAX_TIDE_BEASTS = 12;
export const SHIELD_DURATION = 2;
export const SHIELD_COST = 5;
export const SEAWEED_SPAWN_INTERVAL = 15;
export const SEAWEED_ENERGY = 5;
export const SEAWEED_SCORE = 10;
export const BUILDING_SCORE = 50;
export const CYCLE_SCORE = 100;
export const DAMAGE_DURATION = 3;
export const MAX_DESTROYED = 5;
export const WARNING_TIME = 5;
