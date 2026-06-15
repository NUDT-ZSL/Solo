export type ShapeType = 'pen' | 'rectangle' | 'circle' | 'sticky' | 'eraser';

export type Tool = ShapeType | 'select';

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  type: ShapeType;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  zIndex: number;
  ownerId?: string;
  isRemote?: boolean;
}

export interface PenShape extends BaseShape {
  type: 'pen';
  points: Point[];
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
}

export interface StickyShape extends BaseShape {
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
}

export type Shape = PenShape | RectangleShape | CircleShape | StickyShape;

export interface User {
  id: string;
  name: string;
  color: string;
  cursor: Point;
  isOnline: boolean;
}

export interface HistoryState {
  shapes: Shape[];
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
