export interface Ingredient {
  name: string;
  quantity: number;
  unit?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  image?: string;
}

export interface UserIngredient {
  name: string;
  quantity: number;
}

export type MatchLevel = 'perfect' | 'high' | 'medium' | 'low';

export interface MatchResult {
  recipe: Recipe;
  matchPercentage: number;
  matchLevel: MatchLevel;
  matchedIngredients: string[];
  missingIngredients: Ingredient[];
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit?: string;
  checked?: boolean;
}

export interface FavoriteRecipe {
  id: string;
  name: string;
  addedAt: number;
}
