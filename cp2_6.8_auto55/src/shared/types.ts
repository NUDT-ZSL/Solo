export interface User {
  id: string;
  name: string;
  color: string;
  roomId: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  id: string;
  userId: string;
  color: string;
  size: number;
  points: Point[];
}

export type StickySize = 'small' | 'medium' | 'large';

export interface StickyNote {
  id: string;
  userId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  text: string;
  createdAt: number;
}

export interface Room {
  id: string;
  name: string;
  users: User[];
  maxUsers: number;
  drawings: DrawingPath[];
  stickies: StickyNote[];
}

export const BRUSH_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF',
  '#AF52DE', '#FF2D55', '#8E8E93', '#A2845E', '#FFFFFF',
];

export const STICKY_COLORS = [
  '#FFF9C4', '#E8F5E9', '#E3F2FD', '#F3E5F5',
];

export const STICKY_SIZES: Record<StickySize, { width: number; height: number }> = {
  small: { width: 100, height: 80 },
  medium: { width: 150, height: 120 },
  large: { width: 200, height: 160 },
};

export const DEFAULT_ROOMS = [
  { id: 'room-1', name: '创意空间', maxUsers: 8 },
  { id: 'room-2', name: '产品讨论', maxUsers: 8 },
  { id: 'room-3', name: '设计评审', maxUsers: 8 },
  { id: 'room-4', name: '技术方案', maxUsers: 8 },
];

export type Tool = 'brush' | 'eraser';
