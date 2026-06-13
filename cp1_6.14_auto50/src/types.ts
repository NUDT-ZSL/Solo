export type TileType = 'floor' | 'wall' | 'door';

export type ItemType = 'heal' | 'attack' | 'gold';

export type EnemyType = 'bat' | 'skeleton';

export type GameStatus = 'playing' | 'dead' | 'transitioning';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  gold: number;
  speed: number;
  inventory: Item[];
  radius: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
}

export interface Chest {
  id: string;
  x: number;
  y: number;
  opened: boolean;
  item: Item;
}

export interface Item {
  id: string;
  type: ItemType;
  value: number;
  name: string;
}

export interface Room {
  id: number;
  width: number;
  height: number;
  tiles: TileType[][];
  enemies: Enemy[];
  chests: Chest[];
  seed: number;
  doors: Position[];
}

export interface InputState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  e: boolean;
}

export interface GameData {
  status: GameStatus;
  player: Player;
  currentRoomId: number;
  rooms: Room[];
  seed: number;
  unlockedItems: Item[];
  frameCount: number;
  transitionAlpha: number;
  damageFlash: number;
}
