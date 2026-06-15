export type PuzzleType = 'number' | 'text' | 'image';

export interface Puzzle {
  id: string;
  type: PuzzleType;
  question: string;
  answer: string;
  hint?: string;
  imagePieces?: string[];
  scrambledText?: string;
}

export type ItemType = 'key' | 'safe' | 'sensor' | 'door' | 'note';

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  x: number;
  y: number;
  puzzleId?: string;
  puzzle?: Puzzle;
  solved: boolean;
  collected: boolean;
  effect?: {
    type: 'open_door' | 'remove_wall' | 'play_audio' | 'unlock_next_room';
    targetId?: string;
  };
  doorTargetRoomId?: string;
  doorLocked?: boolean;
}

export interface Wall {
  x: number;
  y: number;
  visible: boolean;
}

export interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  walls: Wall[];
  items: Item[];
  isStartRoom?: boolean;
}

export interface EscapeRoom {
  id: string;
  name: string;
  rooms: Room[];
  designerId: string;
  createdAt: number;
}

export interface PlayerState {
  id: string;
  name: string;
  currentRoomId: string;
  inventory: Item[];
  solvedPuzzles: string[];
  startTime: number;
  totalAttempts: number;
  successfulAttempts: number;
}

export interface GameSession {
  id: string;
  roomId: string;
  escapeRoom: EscapeRoom;
  players: PlayerState[];
  status: 'waiting' | 'playing' | 'completed';
}
