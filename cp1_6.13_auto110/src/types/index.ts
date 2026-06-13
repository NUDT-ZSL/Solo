export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface NodeData {
  _id: string;
  id: string;
  name: string;
  type: 'A' | 'B' | 'C';
  position: Position;
  initialPosition: Position;
  radius: number;
}

export interface EdgeData {
  _id: string;
  id: string;
  sourceId: string;
  targetId: string;
}

export type NodeType = 'A' | 'B' | 'C';

export const NODE_COLORS: Record<NodeType, string> = {
  A: '#6366f1',
  B: '#f59e0b',
  C: '#22c55e'
};
