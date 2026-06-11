export interface Recipe {
  id: number;
  title: string;
  image: string;
  description: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  likes: number;
}
