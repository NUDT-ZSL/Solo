export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  preferences: string[];
  allergens: string[];
  avatarColor: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
}

export type IngredientCategory = 'vegetable' | 'meat' | 'grain' | 'dairy' | 'seasoning' | 'other';

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  cookTime: number;
  calories: number;
  steps: string[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealSlot {
  id: string;
  day: number;
  mealType: MealType;
  recipe: Recipe | null;
  alternatives: Recipe[];
  warnings: string[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedPrice: number;
  purchased: boolean;
}

export interface ShoppingCategory {
  name: string;
  items: ShoppingItem[];
  collapsed: boolean;
}

export interface ShoppingListResponse {
  categories: ShoppingCategory[];
  total: number;
  saved: number;
}
