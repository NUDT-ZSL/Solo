export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  userId: string;
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  tool: ToolType;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  strokes: Stroke[];
  order: number;
}

export interface Frame {
  id: string;
  layers: Layer[];
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export type ToolType = 'brush' | 'eraser' | 'picker';

export interface ToolState {
  tool: ToolType;
  color: string;
  size: number;
  opacity: number;
}

export interface ExportConfig {
  type: 'gif' | 'mp4';
  fps: number;
  resolution: '720p' | '1080p';
}
