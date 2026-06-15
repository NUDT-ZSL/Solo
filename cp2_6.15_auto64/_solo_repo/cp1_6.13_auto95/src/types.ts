export type CellType =
  | 'start'
  | 'property'
  | 'chance'
  | 'fate'
  | 'tax'
  | 'jail'
  | 'parking'
  | 'railway'
  | 'utility';

export interface CellConfig {
  id: number;
  type: CellType;
  name: string;
  gridX: number;
  gridY: number;
  price?: number;
  baseRent?: number;
  colorGroup?: string;
}

export interface Card {
  id: string;
  type: 'chance' | 'fate';
  title: string;
  description: string;
  effect:
    | { type: 'money'; amount: number }
    | { type: 'move'; steps: number }
    | { type: 'jail' }
    | { type: 'position'; position: number };
}

export interface GameConfig {
  cells: CellConfig[];
  cards: Card[];
}

export interface Player {
  id: string;
  name: string;
  color: string;
  cash: number;
  position: number;
  gridX: number;
  gridY: number;
  isBankrupt: boolean;
  inJail: boolean;
  jailTurns: number;
}

export interface Property {
  cellId: number;
  ownerId: string | null;
  level: 0 | 1 | 2 | 3;
}

export interface GameState {
  players: Player[];
  properties: Record<number, Property>;
  currentPlayerIndex: number;
  turn: number;
  diceValue: number | null;
  isRolling: boolean;
  currentCard: Card | null;
  gameStarted: boolean;
  gameOver: boolean;
  winnerId: string | null;
  message: string;
}

export const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
export const PLAYER_NAMES = ['玩家1', '玩家2', '玩家3', '玩家4'];
