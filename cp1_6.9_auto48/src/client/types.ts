export type ToolType = 'pencil' | 'rectangle' | 'circle' | 'note';

export interface Point {
  x: number;
  y: number;
}

export interface DrawCommand {
  id: string;
  userId: string;
  tool: ToolType;
  color: string;
  strokeWidth: number;
  fill?: boolean;
  fillAlpha?: number;
  points?: Point[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  timestamp: number;
  undone?: boolean;
}

export interface Note {
  id: string;
  userId: string;
  x: number;
  y: number;
  content: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
}

export const PRESET_COLORS = [
  '#FF6B6B',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#FF6FFF',
  '#C780FA',
  '#A8E6CF',
  '#FFE66D',
  '#FF8B94',
];

export const USER_COLORS = [
  '#FF6B6B',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#FF6FFF',
  '#C780FA',
  '#00CED1',
  '#FFA07A',
  '#98FB98',
  '#DDA0DD',
  '#F0E68C',
  '#87CEEB',
];

const ANIMALS = [
  '熊猫', '老虎', '狮子', '大象', '长颈鹿', '兔子', '狐狸', '松鼠',
  '海豚', '鲸鱼', '猫头鹰', '鹦鹉', '蝴蝶', '蜜蜂', '青蛙', '乌龟',
];

const ADJECTIVES = [
  '快乐的', '勇敢的', '聪明的', '可爱的', '神秘的', '优雅的', '活泼的', '温柔的',
  '调皮的', '认真的', '梦幻的', '闪亮的', '悠闲的', '机灵的', '暖心的', '酷炫的',
];

export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
}

export function assignUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
