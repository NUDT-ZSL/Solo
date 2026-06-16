export type RecipeCategory = 'chinese' | 'western' | 'dessert';

export interface RecipeStep {
  id: string;
  description: string;
  durationSeconds: number;
}

export interface Rating {
  userId: string;
  score: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  totalMinutes: number;
  colorScheme: 'orange' | 'green' | 'blue';
  steps: RecipeStep[];
  ratings: Rating[];
  isFavorite: boolean;
}

export type StepStatus = 'pending' | 'in-progress' | 'completed';

export interface RecipeProgress {
  completedStepIds: Set<string>;
}

export const COLOR_SCHEMES = {
  orange: { start: '#FF7043', end: '#FFAB91' },
  green: { start: '#66BB6A', end: '#A5D6A7' },
  blue: { start: '#42A5F5', end: '#90CAF9' },
} as const;

export const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  chinese: '中式',
  western: '西式',
  dessert: '甜品',
} as const;
