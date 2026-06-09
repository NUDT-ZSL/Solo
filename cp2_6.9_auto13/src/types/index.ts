export type NodeType = 'rectangle' | 'diamond' | 'circle';

export interface FlowNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface Position {
  x: number;
  y: number;
}
