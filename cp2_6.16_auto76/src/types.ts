export interface Position {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  id: number;
}

export type TileType = 'wall' | 'floor' | 'corridor';

export interface Chest {
  id: string;
  position: Position;
  opened: boolean;
  roomId: number;
}

export type ItemType = 'potion' | 'scroll' | 'coin';

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  value: number;
  description: string;
}

export interface Monster {
  id: string;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  roomId: number;
  name: string;
  isBoss: boolean;
}

export interface Player {
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  hunger: number;
  maxHunger: number;
  gold: number;
  inventory: Item[];
  isDefending: boolean;
}

export interface GameStats {
  steps: number;
  kills: number;
  chestsOpened: number;
  victory: boolean;
  playerName: string;
  timestamp: number;
}

export interface BattleState {
  isActive: boolean;
  monster: Monster | null;
  turn: 'player' | 'monster';
  playerAnimation: 'idle' | 'attack' | 'defend' | 'hit';
  monsterAnimation: 'idle' | 'hit' | 'attack';
  bossAttackTurn: number;
  screenShake: boolean;
}

export type GamePhase = 'menu' | 'playing' | 'battle' | 'victory' | 'defeat' | 'leaderboard';
