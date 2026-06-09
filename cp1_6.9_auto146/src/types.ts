export interface MindMapNode {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
  borderWidth: number;
  fontSize: number;
  lastUpdated: number;
  lastUpdatedBy: string;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  curveType: 'straight' | 'bezier';
}

export interface Snapshot {
  id: string;
  timestamp: number;
  nodes: MindMapNode[];
  connections: Connection[];
}

export interface User {
  userId: string;
  nickname: string;
}

export interface CursorInfo {
  userId: string;
  nickname: string;
  x: number;
  y: number;
}

export const PRESET_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#A29BFE',
  '#FD79A8',
];

export const DEFAULT_NODE_COLOR = '#4ECDC4';
export const NODE_DIAMETER = 60;
export const CONNECTION_COLOR = '#4A90D9';
export const BACKGROUND_COLOR = '#1a1a2e';
