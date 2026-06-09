export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  userId: string;
  createdAt: number;
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  userId: string;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
}

export interface RoomState {
  roomCode: string;
  strokes: Map<string, Stroke>;
  notes: Map<string, StickyNote>;
  users: Map<string, User>;
}

export type ToolMode = 'sticky' | 'brush' | 'select' | 'delete';

export interface HistoryEntry {
  type: 'add' | 'delete';
  itemType: 'stroke' | 'note';
  id: string;
  data: Stroke | StickyNote;
}

export type ServerMessage =
  | { type: 'init'; state: SerializedRoomState; userId: string; userColor: string }
  | { type: 'userJoin'; user: User }
  | { type: 'userLeave'; userId: string }
  | { type: 'addStroke'; stroke: Stroke }
  | { type: 'strokeSegment'; strokeId: string; point: Point; color: string; userId: string }
  | { type: 'strokeEnd'; strokeId: string }
  | { type: 'addNote'; note: StickyNote }
  | { type: 'updateNote'; note: StickyNote }
  | { type: 'deleteItem'; itemType: 'stroke' | 'note'; id: string }
  | { type: 'cursorMove'; userId: string; point: Point };

export type ClientMessage =
  | { type: 'join'; roomCode: string }
  | { type: 'createRoom' }
  | { type: 'addStroke'; stroke: Stroke }
  | { type: 'strokeSegment'; strokeId: string; point: Point; color: string }
  | { type: 'strokeEnd'; strokeId: string }
  | { type: 'addNote'; note: StickyNote }
  | { type: 'updateNote'; note: StickyNote }
  | { type: 'deleteItem'; itemType: 'stroke' | 'note'; id: string }
  | { type: 'cursorMove'; point: Point };

export interface SerializedRoomState {
  roomCode: string;
  strokes: Stroke[];
  notes: StickyNote[];
  users: User[];
}
