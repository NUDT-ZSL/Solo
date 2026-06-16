export enum TileType {
  WALL = 'WALL',
  FLOOR = 'FLOOR'
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
  visible: boolean;
  explored: boolean;
  brightness: number;
}

export interface Player {
  position: Position;
  name: string;
  health: number;
  maxHealth: number;
  lightRadius: number;
  baseLightRadius: number;
  torchesPickedUp: number;
  torchTimer: number;
  exploredCount: number;
}

export interface Monster {
  id: number;
  position: Position;
  alive: boolean;
  moveCounter: number;
  path: Position[];
}

export interface Torch {
  id: number;
  position: Position;
  pickedUp: boolean;
}

export interface GameState {
  map: Tile[][];
  player: Player;
  monsters: Monster[];
  torches: Torch[];
  turn: number;
  visibleTiles: Set<string>;
  gameWon: boolean;
  inBattle: boolean;
  battleMonsterId: number | null;
  battleTimer: number;
}

export interface BSPNode {
  x: number;
  y: number;
  width: number;
  height: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
