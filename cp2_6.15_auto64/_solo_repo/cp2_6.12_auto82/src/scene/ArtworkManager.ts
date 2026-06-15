import { ArtworkItem } from '../store/useStore';

export interface ArtworkTemplate {
  type: string;
  name: string;
  category: 'sculpture' | 'painting' | 'installation';
  dimensions: { width: number; height: number; depth: number };
  color: string;
  description: string;
}

export const artworkTemplates: ArtworkTemplate[] = [
  {
    type: 'sculpture-sphere',
    name: '球体雕塑',
    category: 'sculpture',
    dimensions: { width: 1.5, height: 1.5, depth: 1.5 },
    color: '#c0c0c0',
    description: '抛光金属球体',
  },
  {
    type: 'sculpture-cube',
    name: '立方体装置',
    category: 'sculpture',
    dimensions: { width: 1.2, height: 1.2, depth: 1.2 },
    color: '#4a90d9',
    description: '蓝色磨砂立方体',
  },
  {
    type: 'sculpture-torus',
    name: '环形雕塑',
    category: 'sculpture',
    dimensions: { width: 2, height: 0.8, depth: 2 },
    color: '#ffd700',
    description: '金色环形艺术品',
  },
  {
    type: 'sculpture-cone',
    name: '锥形雕塑',
    category: 'sculpture',
    dimensions: { width: 1, height: 2, depth: 1 },
    color: '#e74c3c',
    description: '红色锥形艺术装置',
  },
  {
    type: 'painting-abstract',
    name: '抽象画',
    category: 'painting',
    dimensions: { width: 3, height: 2, depth: 0.1 },
    color: '#d4af37',
    description: '随机色块抽象画作',
  },
  {
    type: 'painting-landscape',
    name: '风景画',
    category: 'painting',
    dimensions: { width: 2.5, height: 1.8, depth: 0.1 },
    color: '#8b4513',
    description: '印象派风格风景画',
  },
  {
    type: 'painting-portrait',
    name: '肖像画',
    category: 'painting',
    dimensions: { width: 1.5, height: 2, depth: 0.1 },
    color: '#2c3e50',
    description: '现代肖像艺术',
  },
  {
    type: 'installation-pyramid',
    name: '金字塔装置',
    category: 'installation',
    dimensions: { width: 2, height: 2.5, depth: 2 },
    color: '#9b59b6',
    description: '透明金字塔光影装置',
  },
  {
    type: 'installation-cylinder',
    name: '圆柱装置',
    category: 'installation',
    dimensions: { width: 1.2, height: 3, depth: 1.2 },
    color: '#1abc9c',
    description: '发光圆柱艺术装置',
  },
  {
    type: 'installation-tetra',
    name: '四面体装置',
    category: 'installation',
    dimensions: { width: 1.8, height: 2, depth: 1.8 },
    color: '#e67e22',
    description: '几何四面体雕塑',
  },
];

export const getArtworkTemplate = (type: string): ArtworkTemplate | undefined => {
  return artworkTemplates.find((t) => t.type === type);
};

export const generateRandomPaintingColors = (): string[] => {
  const colors: string[] = [];
  const palettes = [
    ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'],
    ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e74c3c'],
    ['#f39c12', '#e67e22', '#d35400', '#c0392b', '#8e44ad'],
    ['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', '#bdc3c7'],
    ['#00cec9', '#0984e3', '#6c5ce7', '#fd79a8', '#fdcb6e'],
  ];
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  for (let i = 0; i < 6; i++) {
    colors.push(palette[Math.floor(Math.random() * palette.length)]);
  }
  return colors;
};

export const createArtworkInstance = (
  type: string,
  position: [number, number, number]
): Omit<ArtworkItem, 'id'> => {
  const template = getArtworkTemplate(type);
  if (!template) {
    throw new Error(`Unknown artwork type: ${type}`);
  }

  return {
    type,
    name: template.name,
    position,
    rotation: [0, 0, 0],
    scale: 1,
    color: template.color,
  };
};

export const getArtworkBottomOffset = (type: string): number => {
  const template = getArtworkTemplate(type);
  if (!template) return 0;
  return template.dimensions.height / 2;
};
