export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  replaced?: boolean;
  originalName?: string;
}

export interface RecipeStep {
  id: string;
  title: string;
  description: string;
  duration: number;
  ingredients: Ingredient[];
  stepOrder: number;
}

export interface Recipe {
  id: string;
  title: string;
  servings: number;
  baseServings: number;
  steps: RecipeStep[];
  confidence: number;
  createdAt: string;
}

export interface IngredientAlternative {
  name: string;
  ratio: number;
}

export interface IngredientReplace {
  ingredient: string;
  alternatives: IngredientAlternative[];
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';
