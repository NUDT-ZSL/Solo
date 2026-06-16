export interface Ingredient {
  id: string;
  name: string;
  weight: number;
  temperature?: number;
  time?: number;
  percentage?: number;
}

export interface RecipeStep {
  id: string;
  title: string;
  description: string;
  timerHours: number;
  timerMinutes: number;
  ingredients: Ingredient[];
}

export interface Recipe {
  id?: string;
  name: string;
  steps: RecipeStep[];
  totalWeight: number;
  createdAt?: string;
}

export interface PresetIngredient {
  name: string;
  density: number;
  unit: string;
  category: string;
}

export interface RecipeTemplate {
  id: string;
  name: string;
  steps: RecipeStep[];
  stepCount: number;
}

export interface IngredientWithPercentage extends Ingredient {
  percentage: number;
}

export interface SaveRecipeRequest {
  name: string;
  steps: RecipeStep[];
  totalWeight: number;
  ingredientPercentages: { name: string; percentage: number }[];
}

export interface SaveRecipeResponse {
  success: boolean;
  message: string;
  id: string;
}
