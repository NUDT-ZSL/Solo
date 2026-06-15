export type NodeType = 'rectangle' | 'diamond' | 'rounded-rectangle';
export type ToolType = 'draw' | 'select' | 'delete';
export type ShapeColorScheme = 'blue' | 'green' | 'orange';

export interface Point {
  x: number;
  y: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: Position;
  size: Size;
  label: string;
  connections: string[];
  cornerRadius?: number;
  originalPath: Point[];
  morphProgress: number;
  createdAt: number;
  isDeleting?: boolean;
  isNew?: boolean;
}

export interface Connection {
  id: string;
  sourceNodeId: string | null;
  targetNodeId: string | null;
  sourceAnchor: Point;
  targetAnchor: Point;
  controlPoints: Point[];
  isBezier: boolean;
  originalPath: Point[];
  createdAt: number;
  isDeleting?: boolean;
  isNew?: boolean;
}

export interface RecognitionResult {
  type: 'node' | 'connection' | 'unknown';
  nodeType?: NodeType;
  confidence: number;
  position?: Position;
  size?: Size;
  cornerRadius?: number;
  sourceAnchor?: Point;
  targetAnchor?: Point;
  startPoint?: Point;
  endPoint?: Point;
}

export interface CanvasState {
  currentTool: ToolType;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  isDrawing: boolean;
  isDragging: boolean;
  dragOffset: Point | null;
  currentPath: Point[];
  animationFrame: number;
  hoveredNodeId: string | null;
}

export interface AnchorState {
  point: Point;
  nodeId: string;
  isAttached: boolean;
  pulseProgress: number;
}

export interface FlowchartData {
  version: string;
  exportedAt?: string;
  nodes: FlowNode[];
  connections: Connection[];
}

export interface MorphAnimation {
  nodeId: string;
  startTime: number;
  duration: number;
  fromPath: Point[];
  toPath: Point[];
  progress: number;
}

export interface RippleState {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface DividerState {
  leftPercent: number;
  isDragging: boolean;
}

export const SHAPE_COLORS: Record<NodeType, { fill: string; border: string; label: ShapeColorScheme }> = {
  'rectangle': { fill: '#89b4fa', border: '#ffffff', label: 'blue' },
  'diamond': { fill: '#a6e3a1', border: '#ffffff', label: 'green' },
  'rounded-rectangle': { fill: '#89b4fa', border: '#ffffff', label: 'blue' },
};

export const ARROW_COLOR = '#fab387';
export const SELECTED_COLOR = '#f38ba8';
export const ANCHOR_ATTACHED_COLOR = '#a6e3a1';
export const ANCHOR_DEFAULT_COLOR = '#6c7086';

export const MORPH_DURATION = 400;
export const ANCHOR_PULSE_DURATION = 300;
export const RIPPLE_DURATION = 500;
export const DELETE_ANIMATION_DURATION = 200;
export const JSON_UPDATE_DELAY = 100;

export function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
