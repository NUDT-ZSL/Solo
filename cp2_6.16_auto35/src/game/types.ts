export enum TileType {
  WALL = 'wall',
  CORRIDOR = 'corridor',
  ROOM = 'room',
  ENTRANCE = 'entrance',
  EXIT = 'exit',
}

export interface Position {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Player {
  position: Position;
  displayPosition: { x: number; y: number };
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export interface Monster {
  id: string;
  position: Position;
  displayPosition: { x: number; y: number };
  hp: number;
  maxHp: number;
  attack: number;
  isBoss: boolean;
  isBlinking: boolean;
}

export enum EquipmentType {
  ATTACK = 'attack',
  HEAL = 'heal',
  DEFENSE = 'defense',
}

export interface Equipment {
  id: string;
  position: Position;
  type: EquipmentType;
  value: number;
  name: string;
  displayName: string;
}

export interface FloatingText {
  id: string;
  worldX: number;
  worldY: number;
  text: string;
  color: string;
  createdAt: number;
  duration: number;
}

export type MapGrid = TileType[][];

export enum GamePhase {
  EXPLORING = 'exploring',
  BOSS = 'boss',
  VICTORY = 'victory',
  GAME_OVER = 'game_over',
}

export interface GameState {
  phase: GamePhase;
  floor: number;
  map: MapGrid;
  rooms: Room[];
  player: Player;
  monsters: Monster[];
  equipments: Equipment[];
  inventory: Equipment[];
  floatingTexts: FloatingText[];
  isShaking: boolean;
  isBossSpecialAttack: boolean;
  bossTurnCount: number;
  playerBlinking: boolean;
}

export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 40;
export const VIEW_SIZE = 20;
export const TILE_SIZE = 30;
export const PLAYER_INITIAL_HP = 20;
export const PLAYER_INITIAL_ATTACK = 5;
export const PLAYER_INITIAL_DEFENSE = 0;
export const MONSTER_HP = 5;
export const MONSTER_ATTACK = 3;
export const MONSTER_COUNT = 5;
export const EQUIPMENT_COUNT = 3;
export const BOSS_HP = 25;
export const BOSS_ATTACK = 8;
