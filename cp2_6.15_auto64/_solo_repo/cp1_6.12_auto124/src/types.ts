export type ShapeType = 'rect' | 'circle' | 'triangle' | 'star';

export interface GradientStop {
  id: string;
  offset: number;
  color: string;
}

export interface Gradient {
  type: 'linear' | 'radial';
  stops: GradientStop[];
  angle: number;
}

export interface Shadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface Shape {
  id: string;
  type: ShapeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  useGradient: boolean;
  gradient: Gradient;
  shadow: Shadow;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export type DragMode = 'move' | 'resize' | 'rotate' | null;

export interface DragState {
  mode: DragMode;
  handle?: string;
  startX: number;
  startY: number;
  startShape: Shape | null;
  startAngle: number;
  startMouseAngle: number;
  offsetX: number;
  offsetY: number;
}

export interface ExportOptions {
  format: 'svg' | 'png';
  scale: 1 | 2 | 4;
  includeSvg: boolean;
}
