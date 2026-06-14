export interface Ingredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  category: string;
  owned: number;
}

export interface Recipe {
  id: number;
  name: string;
  matchScore: number;
  matchedIngredients: string[];
  allIngredients: Ingredient[];
  steps: string[];
}

export interface RecipeDetail extends Recipe {
  categoryColors: Record<string, string>;
}

export interface ShoppingListItem {
  name: string;
  needed: number;
  unit: string;
  color: string;
}

export interface ShoppingListResponse {
  shoppingList: Record<string, ShoppingListItem[]>;
  categoryColors: Record<string, string>;
}

export interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}
