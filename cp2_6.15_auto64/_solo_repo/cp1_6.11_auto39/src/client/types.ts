export interface CausalNode {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface CausalEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface CausalNetwork {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface ActivationState {
  nodeId: string;
  depth: number;
  activatedAt: number;
  isInitial: boolean;
}

export interface PropagationStats {
  maxDepth: number;
  totalActivated: number;
  activatedEdges: string[];
}

export interface NetworkListItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

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

export const ACTIVATION_COLOR = '#FF8C00';
export const INITIAL_PULSE_COLOR = '#FFD700';
