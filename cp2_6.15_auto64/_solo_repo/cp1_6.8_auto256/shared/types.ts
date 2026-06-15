export interface Recipe {
  id: string;
  title: string;
  tags: string[];
  thumbnail: string;
  image: string;
  ingredients: string[];
  steps: string[];
  unlockDate: string;
  isPublic: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  recipeId: string;
  author: string;
  content: string;
  createdAt: string;
}
