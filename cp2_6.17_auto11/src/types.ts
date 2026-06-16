export enum Difficulty {
  EASY = '简单',
  MEDIUM = '中等',
  HARD = '困难'
}

export enum Style {
  ANIMAL = '动物',
  PLANT = '植物',
  GEOMETRIC = '几何'
}

export interface OrigamiWork {
  id: number;
  name: string;
  difficulty: Difficulty;
  style: Style;
  steps: number;
  imageUrl: string;
  primaryColor: string;
}

export interface UserPreferences {
  selectedWorkId: number | null;
  filterStyle: Style | 'all';
  favorites: number[];
}
