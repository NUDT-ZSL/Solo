export interface TreeNode {
  id: string;
  text: string;
  level: number;
  parentId: string | null;
  children: TreeNode[];
  collapsed?: boolean;
}

export interface GraphNode extends TreeNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
  targetX?: number;
  targetY?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export const LEVEL_COLORS: Record<number, string> = {
  1: '#4FC3F7',
  2: '#81C784',
  3: '#FFB74D',
  4: '#E57373',
};

export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 40;
export const NODE_RADIUS = 8;
export const BADGE_RADIUS = 12;
