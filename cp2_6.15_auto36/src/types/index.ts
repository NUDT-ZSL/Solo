export type ElementType = 'text' | 'image' | 'line' | 'shape';

export type ShapeType = 'rectangle' | 'circle' | 'triangle';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export type TextAlign = 'left' | 'center' | 'right';

export type ImageFit = 'cover' | 'contain' | 'fill';

export type BackgroundType = 'solid' | 'gradient' | 'image';

export interface GradientConfig {
  from: string;
  to: string;
  angle: number;
}

export interface BackgroundConfig {
  type: BackgroundType;
  color?: string;
  gradient?: GradientConfig;
  imageUrl?: string;
  imageFit?: ImageFit;
}

export interface LayoutElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: TextAlign;
  imageUrl?: string;
  imageFit?: ImageFit;
  shapeType?: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  lineStyle?: LineStyle;
  lineColor?: string;
  lineThickness?: number;
}

export interface LayoutState {
  elements: LayoutElement[];
  selectedId: string | null;
  background: BackgroundConfig;
}

export interface HistoryState {
  past: LayoutElement[][];
  future: LayoutElement[][];
}

export interface DragItem {
  type: string;
  elementType: ElementType;
  element?: LayoutElement;
}
