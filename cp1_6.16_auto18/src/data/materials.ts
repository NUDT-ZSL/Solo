export interface Material {
  id: string;
  category: string;
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  gradientStart: string;
  gradientEnd: string;
}

export const categories: Category[] = [
  {
    id: 'nature',
    name: '自然',
    gradientStart: '#6B8E23',
    gradientEnd: '#9ACD32',
  },
  {
    id: 'building',
    name: '建筑',
    gradientStart: '#CD853F',
    gradientEnd: '#DEB887',
  },
  {
    id: 'water',
    name: '水景',
    gradientStart: '#4682B4',
    gradientEnd: '#87CEEB',
  },
  {
    id: 'decor',
    name: '装饰',
    gradientStart: '#808080',
    gradientEnd: '#A9A9A9',
  },
];

export const materials: Material[] = [
  {
    id: 'tree-1',
    category: 'nature',
    name: '大树',
    defaultWidth: 60,
    defaultHeight: 80,
    color: '#228B22',
  },
  {
    id: 'tree-2',
    category: 'nature',
    name: '松树',
    defaultWidth: 50,
    defaultHeight: 90,
    color: '#2E8B57',
  },
  {
    id: 'grass-1',
    category: 'nature',
    name: '草丛',
    defaultWidth: 80,
    defaultHeight: 30,
    color: '#7CFC00',
  },
  {
    id: 'flower-1',
    category: 'nature',
    name: '花朵',
    defaultWidth: 40,
    defaultHeight: 40,
    color: '#FF69B4',
  },
  {
    id: 'flower-2',
    category: 'nature',
    name: '向日葵',
    defaultWidth: 45,
    defaultHeight: 60,
    color: '#FFD700',
  },
  {
    id: 'bush-1',
    category: 'nature',
    name: '灌木',
    defaultWidth: 70,
    defaultHeight: 50,
    color: '#32CD32',
  },
  {
    id: 'house-1',
    category: 'building',
    name: '小屋',
    defaultWidth: 100,
    defaultHeight: 90,
    color: '#A0522D',
  },
  {
    id: 'pavilion-1',
    category: 'building',
    name: '亭子',
    defaultWidth: 70,
    defaultHeight: 80,
    color: '#8B4513',
  },
  {
    id: 'fence-1',
    category: 'building',
    name: '栅栏',
    defaultWidth: 120,
    defaultHeight: 40,
    color: '#D2691E',
  },
  {
    id: 'house-2',
    category: 'building',
    name: '瓦房',
    defaultWidth: 110,
    defaultHeight: 85,
    color: '#B8860B',
  },
  {
    id: 'tower-1',
    category: 'building',
    name: '塔楼',
    defaultWidth: 50,
    defaultHeight: 120,
    color: '#696969',
  },
  {
    id: 'bridge-1',
    category: 'water',
    name: '小桥',
    defaultWidth: 100,
    defaultHeight: 50,
    color: '#4169E1',
  },
  {
    id: 'pond-1',
    category: 'water',
    name: '池塘',
    defaultWidth: 140,
    defaultHeight: 90,
    color: '#1E90FF',
  },
  {
    id: 'stream-1',
    category: 'water',
    name: '小溪',
    defaultWidth: 180,
    defaultHeight: 40,
    color: '#00BFFF',
  },
  {
    id: 'waterfall-1',
    category: 'water',
    name: '瀑布',
    defaultWidth: 60,
    defaultHeight: 100,
    color: '#87CEFA',
  },
  {
    id: 'rockery-1',
    category: 'decor',
    name: '假山',
    defaultWidth: 90,
    defaultHeight: 70,
    color: '#696969',
  },
  {
    id: 'lamp-1',
    category: 'decor',
    name: '路灯',
    defaultWidth: 25,
    defaultHeight: 80,
    color: '#2F4F4F',
  },
  {
    id: 'bench-1',
    category: 'decor',
    name: '长椅',
    defaultWidth: 80,
    defaultHeight: 40,
    color: '#8B7355',
  },
  {
    id: 'statue-1',
    category: 'decor',
    name: '雕塑',
    defaultWidth: 40,
    defaultHeight: 70,
    color: '#C0C0C0',
  },
];

export function getMaterialsByCategory(categoryId: string): Material[] {
  return materials.filter((m) => m.category === categoryId);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return categories.find((c) => c.id === categoryId);
}
