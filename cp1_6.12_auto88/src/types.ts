export type FurnitureType = 'sofa' | 'coffeeTable' | 'bookshelf';

export interface FurniturePreset {
  type: FurnitureType;
  name: string;
  size: { width: number; depth: number; height: number };
  color: string;
}

export interface Occluder {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface WindowDef {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  normalX: number;
  normalY: number;
  normalZ: number;
}

export interface WorkerSceneData {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  windows: WindowDef[];
  sunDirectionX: number;
  sunDirectionY: number;
  sunDirectionZ: number;
  sunIntensity: number;
  occluders: Occluder[];
  gridCols: number;
  gridRows: number;
}

export interface WorkerResult {
  samples: Float32Array;
  computeTime: number;
}

export interface GridCellInfo {
  illuminance: number;
  pathCount: number;
}

export const FURNITURE_PRESETS: FurniturePreset[] = [
  {
    type: 'sofa',
    name: '沙发',
    size: { width: 2.0, depth: 0.9, height: 0.8 },
    color: '#a8c0c0',
  },
  {
    type: 'coffeeTable',
    name: '茶几',
    size: { width: 1.2, depth: 0.6, height: 0.4 },
    color: '#c9b99a',
  },
  {
    type: 'bookshelf',
    name: '书架',
    size: { width: 1.0, depth: 0.4, height: 2.0 },
    color: '#8b7d70',
  },
];

export const ROOM_WIDTH = 6;
export const ROOM_DEPTH = 5;
export const ROOM_HEIGHT = 3;

export const WINDOW_WIDTH = 1.2;
export const WINDOW_HEIGHT = 2.2;

export const GRID_COLS = 50;
export const GRID_ROWS = 50;

export const DISPLAY_GRID_COLS = 20;
export const DISPLAY_GRID_ROWS = 20;

export const MAX_ILLUMINANCE = 1000;
export const MAX_PATH_COUNT = 20;
