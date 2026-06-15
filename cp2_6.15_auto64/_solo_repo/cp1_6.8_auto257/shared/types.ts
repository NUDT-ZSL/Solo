export type Tool = 'pen' | 'rect' | 'circle' | 'line' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface DrawOperation {
  id: string;
  tool: Tool;
  points: Point[];
  color: string;
  size: number;
  text?: string;
  userId: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  timestamp: number;
  emojis: Record<string, string[]>;
}

export interface Room {
  roomId: string;
  createdAt: number;
  maxUsers: number;
}

export type WSMessage =
  | { type: 'join'; roomId: string; userId: string }
  | { type: 'leave'; roomId: string; userId: string }
  | { type: 'draw'; roomId: string; operation: DrawOperation }
  | { type: 'undo'; roomId: string; userId: string; operationId: string }
  | { type: 'redo'; roomId: string; userId: string; operation: DrawOperation }
  | { type: 'chat'; roomId: string; message: ChatMessage }
  | { type: 'emoji'; roomId: string; userId: string; emoji: string; targetMsgId: string }
  | { type: 'sync'; roomId: string; operations: DrawOperation[]; messages: ChatMessage[] }
  | { type: 'user_list'; roomId: string; users: string[] }
  | { type: 'error'; message: string };
