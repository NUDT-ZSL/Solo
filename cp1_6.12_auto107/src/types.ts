export interface NoteCard {
  _id?: string;
  id: string;
  title: string;
  content: string;
  category: '学习' | '工作' | '生活';
  x: number;
  y: number;
  linkedIds: string[];
}

export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const CATEGORY_COLORS: Record<string, string> = {
  '学习': '#4CAF50',
  '工作': '#FF9800',
  '生活': '#9C27B0',
};

export const CARD_WIDTH = 220;
export const CARD_MIN_HEIGHT = 120;
export const SNAP_THRESHOLD = 10;
export const GRID_SIZE = 20;
