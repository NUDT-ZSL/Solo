export type NodeColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'gray';

export interface Node {
  id: string;
  label: string;
  description: string;
  color: NodeColor;
  x: number;
  y: number;
  width: number;
  height: number;
  isRoot?: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraph {
  nodes: Node[];
  edges: Edge[];
  version: number;
  lastModified: string;
}

export interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

export interface LayoutOptions {
  width: number;
  height: number;
  iterations: number;
  nodeDistance: number;
}

export interface LayoutResult {
  nodes: { id: string; x: number; y: number }[];
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId?: string;
}

export interface EdgeDragState {
  isDragging: boolean;
  sourceNodeId: string;
  mouseX: number;
  mouseY: number;
}

export type ExportType = 'png' | 'json';
