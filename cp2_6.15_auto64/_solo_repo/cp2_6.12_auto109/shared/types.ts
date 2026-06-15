export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface DrawOperation {
  id: string;
  type: 'pen' | 'eraser' | 'emoji' | 'text';
  userId: string;
  timestamp: number;
  points?: Point[];
  color?: string;
  width?: number;
  emoji?: string;
  text?: string;
  fontFamily?: string;
  x?: number;
  y?: number;
}

export interface User {
  id: string;
  nickname: string;
  color: string;
  socketId: string;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  isDrawing: boolean;
  lastUpdate: number;
}

export interface Reaction {
  id: string;
  userId: string;
  emoji: string;
  timestamp: number;
  duration: number;
}

export interface RippleEffect {
  id: string;
  userId: string;
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export const COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#14b8a6',
  '#84cc16',
  '#f59e0b',
];

export const EMOJI_LIST = [
  '😀', '😂', '🥰', '😎', '🤔', '😴',
  '😍', '🥳', '😭', '😡', '👍', '👎',
  '❤️', '🔥', '💯', '✨', '🎉', '💪',
  '👏', '🙌', '🤝', '💡', '🎨', '✏️',
  '🌟', '🌈', '🍕', '🎮', '📚', '🎵',
  '⭐', '🚀', '💎', '🎁', '🌈', '🌙',
];

export const REACTION_EMOJIS = ['😊', '😲', '😂', '😍', '😡', '👍'];

export const PEN_COLORS = ['#ffffff', '#ef4444', '#22c55e', '#3b82f6', '#eab308'];

export const FONT_FAMILIES = [
  'Arial',
  'Georgia',
  'Courier New',
  'Verdana',
  'Times New Roman',
];
