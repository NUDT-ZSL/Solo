export type BuildingType = 'empty' | 'residential' | 'commercial' | 'industrial' | 'road';

export type BuildingState = 'normal' | 'ruin' | 'repairing' | 'constructing';

export type EventType = 'earthquake' | 'celebration' | 'prosperity';

export interface Building {
  type: BuildingType;
  state: BuildingState;
  level: number;
  constructProgress: number;
  repairProgress: number;
  x: number;
  y: number;
  height: number;
  windowsLit: boolean;
  congestionGlow: number;
}

export interface Vehicle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  speed: number;
  path: { x: number; y: number }[];
  pathIndex: number;
}

export interface GameStats {
  population: number;
  tax: number;
  satisfaction: number;
  energy: number;
  maxEnergy: number;
  safety: number;
  greenery: number;
  traffic: number;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'build' | 'firework' | 'explosion';
}

export interface Camera {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface SaveData {
  grid: Building[][];
  stats: GameStats;
  timeOfDay: number;
  vehicles: Vehicle[];
  vehicleIdCounter: number;
}

export type SaveCallback = (data: SaveData) => void;
export type LoadCallback = (data: SaveData) => void;
