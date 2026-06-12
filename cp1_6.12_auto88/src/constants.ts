import {
  type FurnitureType,
  type FurniturePreset,
  type Occluder,
  type WindowDef,
  type WorkerSceneData,
  type WorkerResult,
  type GridCellInfo,
  type FurnitureInstanceData,
  type FurnitureChangeCallback,
} from './types.d';

export type {
  FurnitureType,
  FurniturePreset,
  Occluder,
  WindowDef,
  WorkerSceneData,
  WorkerResult,
  GridCellInfo,
  FurnitureInstanceData,
  FurnitureChangeCallback,
};

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
