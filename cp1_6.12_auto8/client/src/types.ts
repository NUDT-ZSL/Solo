export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  lineWidth: number;
  userId: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursorPosition: Point | null;
}

export interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  userId: string;
}

export interface RoomState {
  strokes: Stroke[];
  stickyNotes: StickyNoteData[];
  users: User[];
  currentUser: User;
}

export type ToolMode = 'draw' | 'sticky';

export interface ToastMessage {
  id: string;
  type: 'join' | 'leave';
  userName: string;
}

export const COLOR_PALETTE = [
  '#000000',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#FFD700',
  '#FF8C00',
  '#8B4513',
];

export const DEFAULT_COLOR = '#000000';
export const DEFAULT_LINE_WIDTH = 3;
export const DEFAULT_STICKY_COLOR = '#FFD700';
export const DEFAULT_STICKY_WIDTH = 200;
export const DEFAULT_STICKY_HEIGHT = 180;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(p1: Point, p2: Point, t: number): Point {
  return {
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t),
  };
}

export function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
