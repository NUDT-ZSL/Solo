export type Category = '中餐' | '西餐' | '甜品' | '日料' | '韩餐' | '饮品';

export interface Ingredient {
  id: string;
  quantity: string;
  unit: string;
  name: string;
}

export interface RecipeStep {
  id: string;
  title?: string;
  content: string;
  image?: string;
}

export interface Review {
  id: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface Recipe {
  id: string;
  name: string;
  coverImage: string;
  category: Category;
  authorId: string;
  authorName: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  isPublic: boolean;
  createdAt: Date;
  reviews: Review[];
  favoritedBy: string[];
  stepImages?: string[];
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
  createdAt: Date;
}

export const CATEGORY_COLORS: Record<Category, string> = {
  '中餐': '#E74C3C',
  '西餐': '#3498DB',
  '甜品': '#E91E63',
  '日料': '#9B59B6',
  '韩餐': '#27AE60',
  '饮品': '#F39C12'
};

export const CATEGORIES: Category[] = ['中餐', '西餐', '甜品', '日料', '韩餐', '饮品'];
