export type Category =
  | '表情'
  | '动物'
  | '食物'
  | '旅行'
  | '活动'
  | '物体'
  | '符号'
  | '旗帜';

export interface Emoji {
  id: number;
  unicode: string;
  name: string;
  category: Category;
  keywords: string[];
  meaning: string;
  origin: string;
  usageScenarios: string[];
  favorites: number;
}

export const CATEGORIES: Category[] = [
  '表情',
  '动物',
  '食物',
  '旅行',
  '活动',
  '物体',
  '符号',
  '旗帜'
];
