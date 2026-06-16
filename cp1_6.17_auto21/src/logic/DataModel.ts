export type GraphicType = 'pen' | 'rectangle' | 'circle' | 'line';

export interface Point {
  x: number;
  y: number;
}

export interface Graphic {
  id: string;
  type: GraphicType;
  points: Point[];
  color: string;
  strokeWidth: number;
  createdAt: number;
  updatedAt: number;
}

export interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  createdAt: number;
  updatedAt: number;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  parentId: string | null;
}

export interface AnnotationData {
  id: string;
  x: number;
  y: number;
  comments: Comment[];
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_COLORS = [
  '#212121',
  '#E74C3C',
  '#E67E22',
  '#F1C40F',
  '#2ECC71',
  '#1ABC9C',
  '#3498DB',
  '#9B59B6',
  '#E91E63',
  '#795548',
  '#95A5A6',
  '#FFFFFF'
];

export const DEFAULT_COLOR = '#212121';
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 5;
export const DEFAULT_STROKE_WIDTH = 3;

export const STICKY_NOTE_BG_COLOR = '#FFF9C4';
export const STICKY_NOTE_BORDER_COLOR = '#FDD835';
export const STICKY_NOTE_MIN_WIDTH = 100;
export const STICKY_NOTE_MIN_HEIGHT = 80;
export const STICKY_NOTE_DEFAULT_WIDTH = 150;
export const STICKY_NOTE_DEFAULT_HEIGHT = 120;
export const STICKY_NOTE_MIN_FONT_SIZE = 12;
export const STICKY_NOTE_MAX_FONT_SIZE = 24;
export const STICKY_NOTE_DEFAULT_FONT_SIZE = 14;
export const STICKY_NOTE_MAX_TEXT_LENGTH = 100;

export const ANNOTATION_COLOR = '#E74C3C';
export const ANNOTATION_RADIUS = 8;

export const PRIMARY_COLOR = '#E0F7FA';
export const ACCENT_COLOR = '#4FC3F7';
export const TEXT_COLOR = '#212121';

export function serializeGraphic(graphic: Graphic): string {
  return JSON.stringify(graphic);
}

export function deserializeGraphic(json: string): Graphic {
  return JSON.parse(json) as Graphic;
}

export function serializeStickyNote(note: StickyNoteData): string {
  return JSON.stringify(note);
}

export function deserializeStickyNote(json: string): StickyNoteData {
  return JSON.parse(json) as StickyNoteData;
}

export function serializeAnnotation(annotation: AnnotationData): string {
  return JSON.stringify(annotation);
}

export function deserializeAnnotation(json: string): AnnotationData {
  return JSON.parse(json) as AnnotationData;
}

export function createGraphic(
  id: string,
  type: GraphicType,
  points: Point[],
  color: string,
  strokeWidth: number
): Graphic {
  const now = Date.now();
  return {
    id,
    type,
    points,
    color,
    strokeWidth,
    createdAt: now,
    updatedAt: now
  };
}

export function createStickyNote(
  id: string,
  x: number,
  y: number
): StickyNoteData {
  const now = Date.now();
  return {
    id,
    x,
    y,
    width: STICKY_NOTE_DEFAULT_WIDTH,
    height: STICKY_NOTE_DEFAULT_HEIGHT,
    text: '',
    fontSize: STICKY_NOTE_DEFAULT_FONT_SIZE,
    createdAt: now,
    updatedAt: now
  };
}

export function createAnnotation(
  id: string,
  x: number,
  y: number
): AnnotationData {
  const now = Date.now();
  return {
    id,
    x,
    y,
    comments: [],
    createdAt: now,
    updatedAt: now
  };
}
