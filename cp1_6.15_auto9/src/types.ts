export interface Ingredient {
  id: string;
  name: string;
  category: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: '中餐' | '西餐' | '甜品' | '日料' | '韩餐';
  tags: string[];
  cookingTime: number;
  rating: number;
  ingredients: RecipeIngredient[];
  steps: string[];
}

export type SortOrder = 'asc' | 'desc' | null;

export type CategoryFilter = Recipe['category'] | '全部';
