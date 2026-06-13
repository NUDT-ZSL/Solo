export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  checked: boolean;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  rating: number;
  imageUrl: string;
  prepTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  comments: Comment[];
  createdAt: string;
}

export interface UserPreferences {
  cuisines: string[];
  spiceLevel: string[];
  ingredients: string[];
  favorites: string[];
}

export interface FilterState {
  searchQuery: string;
  selectedTags: string[];
  selectedCuisine: string | null;
  selectedDifficulty: string | null;
}
