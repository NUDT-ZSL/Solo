export interface Point {
  x: number;
  y: number;
}

export interface TrailPoint extends Point {
  timestamp: number;
  alpha: number;
  thickness: number;
}

export interface Building {
  x: number;
  baseY: number;
  width: number;
  height: number;
  shape: 'rect' | 'trapezoid';
  topWidth: number;
  opacity: number;
  targetOpacity: number;
  glowColor: string;
  windows: { x: number; y: number; w: number; h: number; lit: boolean }[];
}

export interface BrushParams {
  size: number;
  color: string;
  opacity: number;
  glowColor: string;
}

export interface AppState {
  brush: BrushParams;
  buildings: Building[];
  trails: TrailPoint[][];
  currentTrail: TrailPoint[] | null;
  isDrawing: boolean;
  lastMousePos: Point | null;
  mouseStationaryStart: number;
  zoomLevel: number;
}
