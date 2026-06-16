export type TileType = 0 | 1 | 2 | 3 | 4;

export type MapData = TileType[][];

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  lives: number;
  coins: number;
}

export interface Position {
  x: number;
  y: number;
  timestamp: number;
}

export interface GameStats {
  fps: number;
  deaths: number;
  coins: number;
  playTime: number;
  isGameOver: boolean;
}

export interface HeatmapData {
  positions: Position[];
  densityMatrix: number[][];
}

export interface ExportData {
  mapData: MapData;
  heatmapData: HeatmapData;
  gameStats: {
    deaths: number;
    coins: number;
    playTime: number;
  };
  timestamp: string;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface CollisionResult {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface RippleEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface CoinAnimation {
  row: number;
  col: number;
  startTime: number;
  duration: number;
}

export const GRID_COLS = 10;
export const GRID_ROWS = 15;
export const TILE_SIZE = 32;
export const CANVAS_WIDTH = GRID_COLS * TILE_SIZE;
export const CANVAS_HEIGHT = GRID_ROWS * TILE_SIZE;
export const GRID_COLOR = '#555555';
export const PLAYER_COLOR = '#3B82F6';
export const PLAYER_SIZE = 16;

export const TILE_COLORS: Record<number, string> = {
  0: 'transparent',
  1: '#6B7280',
  2: '#374151',
  3: '#EF4444',
  4: '#FFD700',
};

export const TILE_NAMES: Record<number, string> = {
  1: '地面',
  2: '墙壁',
  3: '尖刺',
  4: '金币',
};

export function createEmptyMap(): MapData {
  return Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => 0 as TileType)
  );
}
