export interface RecipeStep {
  id: string;
  photo: string;
  description: string;
  duration: number;
  rating: number;
  order: number;
}

export interface Recipe {
  id: string;
  name: string;
  createdAt: string;
  steps: RecipeStep[];
  totalDuration: number;
  averageRating: number;
}

export interface Recommendation {
  recipe: Recipe;
  similarity: number;
}

export interface Notification {
  id: string;
  message: string;
  type: 'error' | 'success';
}
