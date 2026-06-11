export type CellType = 'empty' | 'obstacle';

export interface Player {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export interface Hint {
  id: string;
  x: number;
  y: number;
  text: string;
  createdAt: number;
  duration: number;
}

export type ActionType = 'move' | 'toggle_obstacle' | 'add_hint';

export interface Action {
  id: string;
  type: ActionType;
  playerId: string;
  timestamp: number;
  payload: {
    x?: number;
    y?: number;
    newX?: number;
    newY?: number;
    text?: string;
    cellType?: CellType;
  };
}

export interface MazeState {
  width: number;
  height: number;
  grid: CellType[][];
  players: Player[];
  hints: Hint[];
  history: Action[];
}

export type MessageType =
  | 'join'
  | 'leave'
  | 'state_sync'
  | 'player_move'
  | 'toggle_obstacle'
  | 'add_hint'
  | 'history_sync'
  | 'rename_player';

export interface WebSocketMessage {
  type: MessageType;
  roomId: string;
  data?: unknown;
}

export const MAZE_WIDTH = 20;
export const MAZE_HEIGHT = 20;
export const MAX_HISTORY = 100;
export const HINT_DURATION = 5000;
export const PLAYBACK_INTERVAL = 300;

export const PLAYER_COLORS = [
  '#E94560',
  '#0F3460',
  '#16213E',
  '#533483',
  '#00B4D8',
  '#90BE6D',
  '#F94144',
  '#F3722C',
  '#F9C74F',
  '#43AA8B',
  '#577590',
  '#F9844A',
];

export const PLAYER_NAMES = [
  '探险家',
  '迷宫行者',
  '指南针',
  '火炬手',
  '地图师',
  '钥匙匠',
  '线索猎人',
  '冒险者',
];

export function createEmptyGrid(width: number, height: number): CellType[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'empty' as CellType)
  );
}

export function createInitialState(width = MAZE_WIDTH, height = MAZE_HEIGHT): MazeState {
  return {
    width,
    height,
    grid: createEmptyGrid(width, height),
    players: [],
    hints: [],
    history: [],
  };
}

export function getRandomColor(): string {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

export function getRandomName(): string {
  return PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)] +
    Math.floor(Math.random() * 1000);
}
