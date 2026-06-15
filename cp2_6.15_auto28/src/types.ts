export enum TileType {
  FLOOR = 'floor',
  LOW_WALL = 'low_wall',
  HIGH_WALL = 'high_wall',
  DOOR = 'door',
}

export interface Tile {
  type: TileType;
  explored: boolean;
  roomId: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  direction: Direction;
  torchRadius: number;
  torchBoostTimer: number;
  moveCooldown: number;
  rotation: number;
  targetRotation: number;
  rotationProgress: number;
}

export interface Monster {
  id: number;
  x: number;
  y: number;
  hp: number;
  blinkTimer: number;
  moveCooldown: number;
}

export enum ItemType {
  TORCH_BOOST = 'torch_boost',
  HEALTH_POTION = 'health_potion',
}

export interface Item {
  id: number;
  type: ItemType;
  x: number;
  y: number;
}

export interface DoorState {
  x: number;
  y: number;
  open: boolean;
  rotation: number;
}

export interface Room {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PickupEffect {
  type: ItemType;
  x: number;
  y: number;
  timer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  map: Tile[][];
  player: Player;
  monsters: Monster[];
  items: Item[];
  doors: DoorState[];
  rooms: Room[];
  exploredCount: number;
  totalFloorCount: number;
  damageFlash: number;
  pickupEffect: PickupEffect | null;
  particles: Particle[];
  gameOver: boolean;
  visitedTiles: Set<string>;
  exploredRoomIds: Set<number>;
}

export const MAP_SIZE = 30;
export const TILE_SIZE = Math.floor(800 / MAP_SIZE);
export const DEFAULT_TORCH_RADIUS = 5;
export const BOOSTED_TORCH_RADIUS = 8;
export const TORCH_BOOST_DURATION = 15000;
export const PLAYER_MOVE_INTERVAL = 300;
export const ROTATION_DURATION = 150;
export const MONSTER_MOVE_INTERVAL = 1000;
export const DOOR_ANIMATION_DURATION = 300;
export const PICKUP_EFFECT_DURATION = 1000;
export const DAMAGE_FLASH_DURATION = 100;
export const MONSTER_BLINK_PERIOD = 500;
