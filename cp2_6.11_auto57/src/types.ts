export const GRID_SIZE = 20;
export const MAX_HISTORY = 100;

export type CellType = 'empty' | 'obstacle';

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  position: Position;
}

export interface Hint {
  id: string;
  position: Position;
  text: string;
  createdAt: number;
  duration: number;
}

export interface MazeState {
  grid: CellType[][];
  players: Map<string, Player>;
  hints: Hint[];
}

export type OperationType = 
  | 'move' 
  | 'toggle_obstacle' 
  | 'add_hint' 
  | 'player_join' 
  | 'player_leave'
  | 'player_update';

export interface Operation {
  id: string;
  type: OperationType;
  playerId: string;
  timestamp: number;
  data: any;
}

export type MessageType = 
  | 'init' 
  | 'state_sync' 
  | 'operation' 
  | 'history' 
  | 'player_list'
  | 'error';

export interface WSMessage {
  type: MessageType;
  data: any;
  roomId?: string;
  playerId?: string;
}

export interface RoomState {
  id: string;
  grid: CellType[][];
  players: Map<string, Player>;
  hints: Hint[];
  history: Operation[];
}
