export const GRID_SIZE = 10;
export const CELL_SIZE = 50;
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
export const TOTAL_FLOORS = 5;
export const PLAYER_PIXEL_SIZE = 16;
export const MAX_LOG_ENTRIES = 50;

export const COLORS = {
  WALL: '#37474f',
  FLOOR: '#cfd8dc',
  FLOOR_HIGHLIGHT: '#e0e6e8',
  PLAYER: '#66bb6a',
  STAIRS: '#fdd835',
  ENEMY: '#e53935',
  ITEM: '#42a5f5',
  ITEM_HEAL: '#ef5350',
  ITEM_DEFENSE: '#42a5f5',
  ITEM_ATTACK: '#ffd54f',
  BORDER: '#455a64',
  BACKGROUND: '#263238',
  LOG_BG: '#1e2a2f',
  TEXT: '#ffffff'
} as const;

export type TileType = 0 | 1;
export type TileMap = TileType[][];

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export interface Enemy {
  id: number;
  position: Position;
  hp: number;
  maxHp: number;
  defense: number;
  attack: number;
}

export type ItemType = 'heal' | 'defense' | 'attack';

export const ITEM_CONFIG: Record<ItemType, { name: string; icon: string; color: string; value: number }> = {
  heal: { name: '生命药水', icon: '❤', color: COLORS.ITEM_HEAL, value: 15 },
  defense: { name: '守护之盾', icon: '🛡', color: COLORS.ITEM_DEFENSE, value: 5 },
  attack: { name: '力量符文', icon: '⚡', color: COLORS.ITEM_ATTACK, value: 10 }
};

export interface Item {
  id: number;
  position: Position;
  type: ItemType;
  value: number;
}

export interface DungeonLayer {
  floor: number;
  tiles: TileMap;
  stairs: Position;
  enemies: Enemy[];
  items: Item[];
}

export type LogType = 'move' | 'battle' | 'pickup' | 'floor' | 'info';

export interface LogEntry {
  type: LogType;
  message: string;
  timestamp: number;
}

export interface GameState {
  currentFloor: number;
  player: Player;
  layers: DungeonLayer[];
  logs: LogEntry[];
  enemiesDefeated: number;
  isGameOver: boolean;
  isTransitioning: boolean;
  highlightedTile: Position | null;
  highlightTime: number;
  playerOffset: Position;
  playerOffsetTime: number;
}

export const LOG_ICONS: Record<LogType, string> = {
  move: '➤',
  battle: '⚔',
  pickup: '⬆',
  floor: '▼',
  info: '●'
};
