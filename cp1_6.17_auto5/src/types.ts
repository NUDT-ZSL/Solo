export enum TileType {
  WALL = 'wall',
  FLOOR = 'floor'
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  name: string;
  position: Position;
  hp: number;
  maxHp: number;
  lightRadius: number;
  baseLightRadius: number;
  torchTurnsRemaining: number;
  torchesPicked: number;
}

export interface Monster {
  id: number;
  position: Position;
  hp: number;
  alive: boolean;
  nextPath: Position[];
}

export interface Torch {
  id: number;
  position: Position;
  picked: boolean;
}

export interface VisibleTile {
  x: number;
  y: number;
  brightness: number;
  justBecameVisible: boolean;
}

export interface GameState {
  tiles: Tile[][];
  player: Player;
  monsters: Monster[];
  torches: Torch[];
  turn: number;
  exploredSet: Set<string>;
  visibleMap: Map<string, VisibleTile>;
  prevVisibleSet: Set<string>;
  fogTransitionMap: Map<string, number>;
  battleAnimation: { monsterId: number; progress: number } | null;
  won: boolean;
  gameOver: boolean;
}
