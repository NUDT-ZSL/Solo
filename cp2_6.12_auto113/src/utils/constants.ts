import type { NodeColor } from '@/types';

export const COLOR_MAP: Record<NodeColor, string> = {
  red: '#ef5350',
  orange: '#ff9800',
  yellow: '#ffeb3b',
  green: '#4caf50',
  cyan: '#00bcd4',
  blue: '#1976d2',
  purple: '#9c27b0',
  gray: '#9e9e9e',
};

export const COLOR_LABELS: Record<NodeColor, string> = {
  red: '红色',
  orange: '橙色',
  yellow: '黄色',
  green: '绿色',
  cyan: '青色',
  blue: '蓝色',
  purple: '紫色',
  gray: '灰色',
};

export const COLOR_ORDER: NodeColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'purple',
  'gray',
];

export const NODE_DEFAULT_WIDTH = 120;
export const NODE_DEFAULT_HEIGHT = 60;
export const NODE_MOBILE_WIDTH = 150;
export const NODE_ANCHOR_RADIUS = 8;
export const ANIMATION_DURATION = 0.3;
export const LAYOUT_ANIMATION_DURATION = 1.5;
export const MAX_HISTORY_STACK = 50;
export const STORAGE_KEY = 'knowledge-graph-data';
export const GRID_SIZE = 10;
export const CANVAS_BACKGROUND = '#f5f5f5';
export const PRIMARY_COLOR = '#1976d2';
export const SECONDARY_COLOR = '#ff9800';
export const EDGE_COLOR = '#757575';
export const EDGE_DRAG_COLOR = '#ef5350';
export const EDGE_WIDTH = 2;
export const MOBILE_BREAKPOINT = 768;
export const MAX_DESCRIPTION_LENGTH = 100;
export const DEFAULT_RELATION_LABELS = ['属于', '导致', '参考', '包含', '关联'];
