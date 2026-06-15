export type ToolType = 'select' | 'anchor' | 'text' | 'arrow' | 'ruler';

export interface BaseElement {
  id: string;
  type: 'anchor' | 'text' | 'arrow' | 'ruler';
  x: number;
  y: number;
}

export interface AnchorElement extends BaseElement {
  type: 'anchor';
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  color: string;
  width?: number;
  height?: number;
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
}

export interface RulerElement extends BaseElement {
  type: 'ruler';
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
}

export type AnnotationElement = AnchorElement | TextElement | ArrowElement | RulerElement;

export interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

export const PRESET_COLORS = [
  '#000000',
  '#e53935',
  '#1e88e5',
  '#43a047',
  '#fb8c00',
  '#8e24aa',
];

export const ANCHOR_COLOR = '#e53935';
export const ARROW_DEFAULT_COLOR = '#1e88e5';
export const RULER_DEFAULT_COLOR = '#1e88e5';
export const SELECT_HIGHLIGHT = '#4a90d9';
