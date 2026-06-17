export type ElementCategory =
  | 'primaryColor'
  | 'secondaryColor'
  | 'font'
  | 'layout'
  | 'pattern'
  | 'iconStyle';

export interface ElementItem {
  id: string;
  category: ElementCategory;
  name: string;
  value: string;
  preview?: string;
}

export interface BoardElement {
  id: string;
  elementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  zIndex: number;
}

export interface SavedBoard {
  id: string;
  name: string;
  tags: string[];
  elements: BoardElement[];
  createdAt: number;
  thumbnail?: string;
}

export interface ScoreResult {
  total: number;
  contrast: number;
  fontCount: number;
  density: number;
}

export interface ElementLibrary {
  primaryColor: ElementItem[];
  secondaryColor: ElementItem[];
  font: ElementItem[];
  layout: ElementItem[];
  pattern: ElementItem[];
  iconStyle: ElementItem[];
}

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  primaryColor: '主色调',
  secondaryColor: '辅助色',
  font: '字体',
  layout: '布局模板',
  pattern: '图案纹理',
  iconStyle: '图标风格',
};
