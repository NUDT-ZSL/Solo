export interface Ingredient {
  name: string;
  amount: string;
}

export interface RecipeStep {
  order: number;
  description: string;
}

export interface Recipe {
  _id?: string;
  name: string;
  image: string;
  prepTime: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  favorite: boolean;
  createdAt?: string;
}

export interface SearchResult {
  recipe: Recipe;
  matchCount: number;
}
