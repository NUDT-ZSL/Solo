export const GRID_ROWS = 10;
export const GRID_COLS = 14;
export const CELL_SIZE = 40;
export const NODE_RADIUS = 4;
export const SEGMENT_THICKNESS = 3;
export const MAX_DRAG_DISTANCE = 5;

export const SILK_COLORS: string[] = [
  'hsl(0, 70%, 85%)',
  'hsl(45, 70%, 85%)',
  'hsl(90, 70%, 85%)',
  'hsl(135, 70%, 85%)',
  'hsl(180, 70%, 85%)',
  'hsl(225, 70%, 85%)',
  'hsl(270, 70%, 85%)',
  'hsl(315, 70%, 85%)'
];

export interface GridNode {
  row: number;
  col: number;
  color: string | null;
  colorOpacity: number;
  locked: boolean;
}

export interface WeaveSegment {
  id: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  startColor: string;
  endColor: string;
  thickness: number;
}

export interface WeaveData {
  nodes: GridNode[];
  segments: WeaveSegment[];
}

export interface WeaveWork {
  id: string;
  baseId: string;
  version: number;
  name: string;
  createdAt: number;
  data: WeaveData;
}

export interface SaveWeaveRequest {
  name: string;
  data: WeaveData;
  baseId?: string;
  version?: number;
}

export interface SaveWeaveResponse {
  success: boolean;
  id: string;
  url: string;
}

export interface WeaveThumbnail {
  id: string;
  name: string;
  data: WeaveData;
  createdAt: number;
}

export type WorkerAction =
  | { type: 'colorNode'; row: number; col: number; color: string; nodes: GridNode[]; segments: WeaveSegment[] }
  | { type: 'dragSegment'; startRow: number; startCol: number; endRow: number; endCol: number; nodes: GridNode[]; segments: WeaveSegment[] };

export interface WorkerResult {
  nodes: GridNode[];
  segments: WeaveSegment[];
}

export function createEmptyNodes(): GridNode[] {
  const nodes: GridNode[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      nodes.push({
        row: r,
        col: c,
        color: null,
        colorOpacity: 1,
        locked: false
      });
    }
  }
  return nodes;
}

export function cloneWeaveData(data: WeaveData): WeaveData {
  return {
    nodes: data.nodes.map(n => ({ ...n })),
    segments: data.segments.map(s => ({ ...s }))
  };
}
