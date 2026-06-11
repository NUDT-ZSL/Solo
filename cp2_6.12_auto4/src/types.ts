export type ToolType = 'brush' | 'rectangle' | 'circle' | 'text' | 'eraser';

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface StrokeShape {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawAction {
  id: string;
  userId: string;
  userName: string;
  tool: ToolType;
  color: string;
  lineWidth: number;
  points?: Point[];
  shape?: StrokeShape;
  text?: string;
  textPosition?: Point;
  opacity: number;
  createdAt: number;
}

export interface UndoAction {
  type: 'undo';
  actionId: string;
  userId: string;
}

export interface RedoAction {
  type: 'redo';
  action: DrawAction;
  userId: string;
}

export interface UserJoin {
  type: 'join';
  userId: string;
  userName: string;
  color: string;
}

export interface UserLeave {
  type: 'leave';
  userId: string;
}

export interface InitState {
  type: 'init';
  history: DrawAction[];
  userId: string;
  color: string;
}

export type WebSocketMessage =
  | { type: 'draw'; action: DrawAction }
  | { type: 'undo'; actionId: string; userId: string }
  | { type: 'redo'; action: DrawAction; userId: string }
  | { type: 'join'; userId: string; userName: string; color: string }
  | { type: 'leave'; userId: string }
  | { type: 'init'; history: DrawAction[]; userId: string; color: string }
  | { type: 'stroke'; action: DrawAction }
  | { type: 'users'; users: Array<{ id: string; name: string; color: string }> };

export interface ConnectedUser {
  id: string;
  name: string;
  color: string;
}
