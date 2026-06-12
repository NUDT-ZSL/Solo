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

export interface FurnitureInstanceData {
  id: string;
  type: FurnitureType;
  position: { x: number; y: number; z: number };
  rotationY: number;
  size: { width: number; depth: number; height: number };
}

export interface FurnitureChangeCallback {
  (instances: FurnitureInstanceData[]): void;
}

export declare const FURNITURE_PRESETS: FurniturePreset[];
export declare const ROOM_WIDTH: number;
export declare const ROOM_DEPTH: number;
export declare const ROOM_HEIGHT: number;
export declare const WINDOW_WIDTH: number;
export declare const WINDOW_HEIGHT: number;
export declare const GRID_COLS: number;
export declare const GRID_ROWS: number;
export declare const DISPLAY_GRID_COLS: number;
export declare const DISPLAY_GRID_ROWS: number;
export declare const MAX_ILLUMINANCE: number;
export declare const MAX_PATH_COUNT: number;
