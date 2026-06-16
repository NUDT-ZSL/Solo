export const DEFAULT_GRID_CONFIG = {
  rows: 6,
  cols: 8,
  cellSize: 50,
  gridLineColor: '#D3D3D3',
  gridLineWidth: 1,
  gridBgColor: '#FFFFFF'
};

export const MODULE_TYPES = {
  STORAGE_BOX: 'storage_box',
  PARTITION: 'partition',
  DRAWER: 'drawer'
} as const;

export type ModuleType = typeof MODULE_TYPES[keyof typeof MODULE_TYPES];

export interface ModuleStyle {
  bgColor: string;
  widthCells: number;
  heightCells: number;
  label: string;
}

export const MODULE_STYLES: Record<ModuleType, ModuleStyle> = {
  [MODULE_TYPES.STORAGE_BOX]: {
    bgColor: '#8B4513',
    widthCells: 2,
    heightCells: 2,
    label: '收纳箱'
  },
  [MODULE_TYPES.PARTITION]: {
    bgColor: '#A0522D',
    widthCells: 4,
    heightCells: 1,
    label: '隔板'
  },
  [MODULE_TYPES.DRAWER]: {
    bgColor: '#DEB887',
    widthCells: 2,
    heightCells: 1,
    label: '抽屉'
  }
};

export const PRESET_ITEM_CATEGORIES = [
  { name: '冬衣', emoji: '🧥' },
  { name: '书籍', emoji: '📚' },
  { name: '工具', emoji: '🔧' },
  { name: '鞋子', emoji: '👟' },
  { name: '玩具', emoji: '🧸' },
  { name: '文件', emoji: '📁' },
  { name: '电子产品', emoji: '📱' },
  { name: '厨房用品', emoji: '🍳' },
  { name: '床上用品', emoji: '🛏️' },
  { name: '运动器材', emoji: '⚽' }
];

export const PRESET_ROOM_TEMPLATES = [
  {
    id: 'bedroom-closet',
    name: '卧室衣柜',
    description: '标准卧室双开门衣柜布局'
  },
  {
    id: 'kitchen-cabinet',
    name: '厨房橱柜',
    description: 'L型厨房橱柜收纳方案'
  },
  {
    id: 'study-room',
    name: '书房储物',
    description: '书架与文件柜组合'
  }
];
