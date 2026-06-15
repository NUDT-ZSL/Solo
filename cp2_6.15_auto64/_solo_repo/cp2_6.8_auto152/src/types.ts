export interface Point {
  x: number;
  y: number;
}

export interface User {
  id: string;
  color: string;
  animal: string;
  name: string;
  cursor: Point | null;
  lastSeen: number;
}

export type DrawMode = 'pen' | 'sticky' | 'emoji';

export interface PathData {
  id: string;
  type: 'path';
  points: Point[];
  color: string;
  width: number;
  userId: string;
  createdAt: number;
}

export interface StickyData {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  text: string;
  color: string;
  userId: string;
  createdAt: number;
}

export interface EmojiData {
  id: string;
  type: 'emoji';
  x: number;
  y: number;
  emoji: string;
  userId: string;
  createdAt: number;
}

export type CanvasElement = PathData | StickyData | EmojiData;

export interface HistoryEntry {
  id: string;
  operation: 'add' | 'clear' | 'move';
  elementId?: string;
  element?: CanvasElement;
  userId: string;
  userColor: string;
  userAnimal: string;
  userName: string;
  timestamp: number;
}

export const ANIMALS = ['🐻', '🐱', '🐶', '🦊', '🐰', '🐼', '🐸', '🦁', '🐵', '🐨', '🦄', '🐷'];
export const ANIMAL_NAMES = ['熊', '猫', '狗', '狐狸', '兔子', '熊猫', '青蛙', '狮子', '猴子', '考拉', '独角兽', '猪'];

export const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#81ECEC'
];

export const EMOJI_LIST = ['😀', '😍', '🎉', '⭐', '💡', '🔥', '❤️', '👍', '🎯', '🚀'];
