export interface Point {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  type: 'stroke';
  points: Point[];
  color: string;
  width: number;
  userId: string;
  roomId: string;
  timestamp: number;
}

export interface StickyNote {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  content: string;
  bgColor: string;
  userId: string;
  userName: string;
  roomId: string;
  timestamp: number;
  votes: Record<string, 1 | -1>;
}

export type CanvasElement = DrawStroke | StickyNote;

export interface VotePayload {
  noteId: string;
  userId: string;
  vote: 1 | -1;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

export type SortMode = 'votes' | 'newest' | 'oldest';

export type ToolType = 'brush' | 'sticky' | 'eraser';

export interface WsMessage {
  type: 'join' | 'leave' | 'draw' | 'clear' | 'sticky-add' | 'sticky-update' | 'vote' | 'sync' | 'online-count';
  payload: any;
}

export const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#06b6d4', '#a855f7'
];

export const ANIMALS = [
  '海豚', '熊猫', '狐狸', '老虎', '兔子', '猫头鹰',
  '松鼠', '狮子', '企鹅', '考拉', '长颈鹿', '大象'
];

export const COLOR_NAMES: Record<string, string> = {
  '#3b82f6': '蓝色', '#ef4444': '红色', '#22c55e': '绿色', '#f59e0b': '橙色',
  '#8b5cf6': '紫色', '#ec4899': '粉色', '#14b8a6': '青色', '#f97316': '橘色',
  '#6366f1': '靛蓝', '#84cc16': '黄绿', '#06b6d4': '天蓝', '#a855f7': '紫罗兰'
};

export const STICKY_COLORS = ['#fef08a', '#bfdbfe', '#bbf7d0', '#fecaca'];
