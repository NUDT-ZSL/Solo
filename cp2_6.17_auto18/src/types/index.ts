export type WallShape = 'rectangle' | 'L-shape' | 'arc';

export interface Wall {
  id: string;
  shape: WallShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  arcRadius?: number;
  arcStartAngle?: number;
  arcEndAngle?: number;
  lShapeSecondWidth?: number;
  lShapeSecondHeight?: number;
}

export interface Exhibit {
  id: string;
  wallId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  imageUrl: string;
  name: string;
  description?: string;
}

export interface Exhibition {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  walls: Wall[];
  exhibits: Exhibit[];
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
}

export interface PathStats {
  pathLength: number;
  estimatedTime: number;
  visibilityScores: {
    exhibitId: string;
    visibility: number;
  }[];
}

export type ToolType = 'select' | 'rectangle' | 'L-shape' | 'arc' | 'save' | 'load' | 'delete';

export interface Point {
  x: number;
  y: number;
}

export interface DragState {
  isDragging: boolean;
  type: 'wall' | 'exhibit' | null;
  id: string | null;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
}
