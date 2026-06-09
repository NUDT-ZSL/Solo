export interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  colorIndex: number;
  isEditing?: boolean;
  isFullscreen?: boolean;
  createdAt: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  strength: number;
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  connectionCount: number;
}

export interface CanvasProject {
  id: string;
  stickies: StickyNote[];
  connections: Connection[];
  createdAt: number;
  updatedAt: number;
}

export const COLOR_PALETTE = [
  '#FFE3B0',
  '#B5EAD7',
  '#C7CEEA',
  '#FFB7B2',
  '#E2F0CB'
];
