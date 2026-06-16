import type { FlavorTag } from '@/types';

export const FLAVOR_TAGS: FlavorTag[] = [
  { id: 'jasmine', name: '茉莉', category: 'floral', color: '#FFB7C5' },
  { id: 'rose', name: '玫瑰', category: 'floral', color: '#FF69B4' },
  { id: 'chamomile', name: '洋甘菊', category: 'floral', color: '#FFFACD' },
  { id: 'lavender', name: '薰衣草', category: 'floral', color: '#E6E6FA' },
  { id: 'earl-grey', name: '伯爵茶', category: 'floral', color: '#B0E0E6' },

  { id: 'lemon', name: '柠檬', category: 'fruity', color: '#FFF44F' },
  { id: 'orange', name: '橙子', category: 'fruity', color: '#FFA500' },
  { id: 'berry', name: '莓果', category: 'fruity', color: '#C71585' },
  { id: 'peach', name: '水蜜桃', category: 'fruity', color: '#FFCBA4' },
  { id: 'grape', name: '葡萄', category: 'fruity', color: '#9370DB' },
  { id: 'apple', name: '苹果', category: 'fruity', color: '#FF6347' },
  { id: 'pineapple', name: '菠萝', category: 'fruity', color: '#FFE135' },

  { id: 'almond', name: '杏仁', category: 'nutty', color: '#DEB887' },
  { id: 'walnut', name: '核桃', category: 'nutty', color: '#8B4513' },
  { id: 'hazelnut', name: '榛果', category: 'nutty', color: '#D2691E' },
  { id: 'peanut', name: '花生', category: 'nutty', color: '#E4B87A' },

  { id: 'dark-chocolate', name: '黑巧克力', category: 'chocolate', color: '#3D2B1F' },
  { id: 'milk-chocolate', name: '牛奶巧克力', category: 'chocolate', color: '#7B3F00' },
  { id: 'cocoa', name: '可可', category: 'chocolate', color: '#5C4033' },

  { id: 'cinnamon', name: '肉桂', category: 'spicy', color: '#D2691E' },
  { id: 'clove', name: '丁香', category: 'spicy', color: '#8B0000' },
  { id: 'pepper', name: '胡椒', category: 'spicy', color: '#2F4F4F' },
  { id: 'cardamom', name: '豆蔻', category: 'spicy', color: '#8FBC8F' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  floral: '花香',
  fruity: '果香',
  nutty: '坚果',
  chocolate: '巧克力',
  spicy: '香料',
};

export const CATEGORY_COLORS: Record<string, string> = {
  floral: '#E91E63',
  fruity: '#FF5722',
  nutty: '#795548',
  chocolate: '#3E2723',
  spicy: '#FF9800',
};

export const ROAST_LABELS: Record<string, string> = {
  light: '浅烘',
  medium: '中烘',
  dark: '深烘',
};

export const PROCESS_LABELS: Record<string, string> = {
  washed: '水洗',
  natural: '日晒',
  honey: '蜜处理',
};
