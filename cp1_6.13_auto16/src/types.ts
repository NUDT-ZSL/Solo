export type BlockType = 'article-card' | 'sidebar' | 'footer';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface LayoutBlock {
  id: string;
  type: BlockType;
  position: Position;
  size: Size;
  fillColor: string;
  borderColor: string;
  zIndex: number;
}

export interface Scheme {
  id: string;
  name: string;
  blocks: LayoutBlock[];
  thumbnail: string;
  createdAt: number;
}

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const GRID_SIZE = 20;
export const MIN_BLOCK_SIZE = 100;

export const BLOCK_PRESETS: Record<BlockType, { size: Size; fillColor: string; borderColor: string; label: string }> = {
  'article-card': {
    size: { width: 280, height: 360 },
    fillColor: '#ffffff',
    borderColor: '#e5e7eb',
    label: '文章卡片',
  },
  'sidebar': {
    size: { width: 280, height: 600 },
    fillColor: '#dbeafe',
    borderColor: '#93c5fd',
    label: '侧边栏',
  },
  'footer': {
    size: { width: 1200, height: 120 },
    fillColor: '#1f2937',
    borderColor: '#111827',
    label: '页脚',
  },
};
