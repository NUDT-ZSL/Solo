export enum TowerType {
  TIDAL_TURBINE = 'TIDAL_TURBINE',
  CURRENT_WING = 'CURRENT_WING',
  OSCILLATING_WATER_COLUMN = 'OSCILLATING_WATER_COLUMN',
  STORAGE_TOWER = 'STORAGE_TOWER',
}

export interface HexCoord {
  row: number;
  col: number;
  pixelX: number;
  pixelY: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  level: number;
  efficiency: number;
  accumulatedEnergy: number;
  position: HexCoord;
  scaleAnim: number;
}

export interface TideState {
  tideHeight: number;
  currentSpeed: number;
  currentDirection: number;
  cycleTime: number;
}

export interface GameState {
  energyCoins: number;
  totalEnergy: number;
  paused: boolean;
  elapsedTime: number;
  towers: Map<string, Tower>;
  selectedTowerId: string | null;
}

export const GRID_ROWS = 8;
export const GRID_COLS = 8;
export const HEX_SIZE = 30;
export const HEX_HORIZONTAL_SPACING = 60;
export const HEX_VERTICAL_SPACING = 52;
export const TOWER_RADIUS = 12.5;
export const BASE_OUTPUT = 10;
export const INITIAL_COINS = 500;
export const PLACE_COST = 100;
export const UPGRADE_COSTS: Record<number, number> = { 1: 200, 2: 400 };
export const TIDE_CYCLE = 30;
export const CURRENT_CHANGE_INTERVAL = 10;
export const TIDE_MIN = 0.5;
export const TIDE_MAX = 4.5;
export const CURRENT_MIN_SPEED = 0.3;
export const CURRENT_MAX_SPEED = 2.0;

export const TOWER_INFO: Record<TowerType, { name: string; color: string; icon: string }> = {
  [TowerType.TIDAL_TURBINE]: { name: '潮汐涡轮', color: '#00bcd4', icon: 'turbine' },
  [TowerType.CURRENT_WING]: { name: '洋流翼', color: '#26c6da', icon: 'wing' },
  [TowerType.OSCILLATING_WATER_COLUMN]: { name: '振荡水柱', color: '#4dd0e1', icon: 'owc' },
  [TowerType.STORAGE_TOWER]: { name: '储能塔', color: '#ffd54f', icon: 'storage' },
};

export const DIRECTIONS_8 = [0, 45, 90, 135, 180, 225, 270, 315];
