export interface Ingredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  pricePerUnit?: number;
}

export interface RecipeStep {
  order: number;
  description: string;
}

export interface Recipe {
  id: number;
  name: string;
  author: string;
  thumbnail: string;
  rating: number;
  isFavorite: boolean;
  ingredients: Ingredient[];
  steps: RecipeStep[];
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  pricePerUnit: number;
  checked: boolean;
  note?: string;
  highlight?: boolean;
}

export interface AggregateRequest {
  recipeIds: number[];
  scales: Record<number, number>;
}

export interface WSMessage {
  type: 'join' | 'item-update' | 'item-toggle' | 'peer-update' | 'peer-toggle';
  listId: string;
  itemId?: string;
  changes?: Partial<GroceryItem>;
  checked?: boolean;
  userId?: string;
}
