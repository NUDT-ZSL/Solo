export interface MindNode {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface MindMapData {
  nodes: MindNode[];
  connections: Connection[];
}

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  data: MindMapData;
  description: string;
}

export interface UserCursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export type ActionType =
  | 'node:create'
  | 'node:update'
  | 'node:delete'
  | 'node:move'
  | 'connection:create'
  | 'connection:delete'
  | 'version:restore';

export interface BaseAction {
  type: ActionType;
  timestamp: number;
  userId: string;
  description: string;
}

export interface NodeAction extends BaseAction {
  type: 'node:create' | 'node:update' | 'node:delete' | 'node:move';
  node: MindNode;
  previousNode?: MindNode;
}

export interface ConnectionAction extends BaseAction {
  type: 'connection:create' | 'connection:delete';
  connection: Connection;
}

export interface RestoreAction extends BaseAction {
  type: 'version:restore';
  versionId: string;
  data: MindMapData;
}

export type HistoryAction = NodeAction | ConnectionAction | RestoreAction;

export type WSMessageType =
  | 'init'
  | 'action'
  | 'cursor'
  | 'versions'
  | 'users'
  | 'ping'
  | 'pong';

export interface WSBaseMessage {
  type: WSMessageType;
}

export interface WSInitMessage extends WSBaseMessage {
  type: 'init';
  data: MindMapData;
  versions: VersionSnapshot[];
  userId: string;
  users: UserCursor[];
}

export interface WSActionMessage extends WSBaseMessage {
  type: 'action';
  action: HistoryAction;
}

export interface WSCursorMessage extends WSBaseMessage {
  type: 'cursor';
  cursor: UserCursor;
}

export interface WSVersionsMessage extends WSBaseMessage {
  type: 'versions';
  versions: VersionSnapshot[];
}

export interface WSUsersMessage extends WSBaseMessage {
  type: 'users';
  users: UserCursor[];
}

export interface WSPingMessage extends WSBaseMessage {
  type: 'ping';
  timestamp: number;
}

export interface WSPongMessage extends WSBaseMessage {
  type: 'pong';
  timestamp: number;
}

export type WSMessage =
  | WSInitMessage
  | WSActionMessage
  | WSCursorMessage
  | WSVersionsMessage
  | WSUsersMessage
  | WSPingMessage
  | WSPongMessage;

export const COLOR_PALETTE = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
];

export const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E74C3C',
  '#3498DB',
];
