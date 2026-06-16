export type Coord = { x: number; y: number };

export type Direction = 'up' | 'down' | 'left' | 'right';

export type TileType =
  | 'floor'
  | 'wall'
  | 'trap'
  | 'pressurePlate'
  | 'exit'
  | 'gate';

export interface Tile {
  coord: Coord;
  type: TileType;
  plateId?: string;
}

export interface Player {
  coord: Coord;
}

export interface Rock {
  id: string;
  coord: Coord;
}

export interface Companion {
  id: string;
  coord: Coord;
  rescued: boolean;
}

export interface GateTimer {
  plateCoord: Coord;
  gateCoords: Coord[];
  startTime: number;
  duration: number;
}

export interface GameEvent {
  type: 'move' | 'trap' | 'rescue' | 'plateOn' | 'plateOff' | 'win' | 'reset';
  payload?: any;
}

export interface LevelData {
  id: number;
  width: number;
  height: number;
  walls: Coord[];
  traps: Coord[];
  rocks: Rock[];
  pressurePlates: Coord[];
  pressurePlateToGate: Map<string, Coord[]>;
  companions: Omit<Companion, 'rescued'>[];
  exit: Coord;
  playerStart: Coord;
  stepLimit: number;
}

export interface GameState {
  levelIndex: number;
  levelData: LevelData;
  player: Player;
  rocks: Rock[];
  companions: Companion[];
  removedGates: Set<string>;
  gateTimers: GateTimer[];
  stepCount: number;
  rescuedCount: number;
  totalCompanions: number;
  lastMoveTime: number;
  trapFlashStart: number;
  isFailed: boolean;
  isCleared: boolean;
  startTime: number;
}

export const GRID_SIZE = 8;
export const TILE_SIZE = 80;
export const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;
export const MOVE_INTERVAL = 150;
export const GATE_DURATION = 800;
export const TRAP_FLASH_DURATION = 500;

export const coordToKey = (c: Coord): string => `${c.x},${c.y}`;
