import axios from 'axios';

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  matchCount?: number;
  matchPercentage?: number;
  matchedIngredients?: string[];
  hasNote?: boolean;
}

export interface ShoppingItem {
  name: string;
  amount: string;
  checked: boolean;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000
});

export const searchRecipes = (ingredients: string): Promise<Recipe[]> => {
  return api.get('/search', { params: { ingredients } }).then(res => res.data);
};

export const getRecipe = (id: string): Promise<Recipe> => {
  return api.get(`/recipes/${id}`).then(res => res.data);
};

export const getFavorites = (): Promise<Recipe[]> => {
  return api.get('/favorites').then(res => res.data);
};

export const addFavorite = (recipeId: string): Promise<{ favorited: boolean }> => {
  return api.post('/favorites', { recipeId }).then(res => res.data);
};

export const removeFavorite = (recipeId: string): Promise<{ favorited: boolean }> => {
  return api.delete(`/favorites/${recipeId}`).then(res => res.data);
};

export const checkFavorite = (recipeId: string): Promise<{ favorited: boolean }> => {
  return api.get(`/favorites/${recipeId}`).then(res => res.data);
};

export const getNote = (recipeId: string): Promise<string> => {
  return api.get(`/notes/${recipeId}`).then(res => res.data);
};

export const saveNote = (recipeId: string, content: string): Promise<{ success: boolean }> => {
  return api.post('/notes', { recipeId, content }).then(res => res.data);
};

export const saveShoppingList = (recipeId: string, items: ShoppingItem[]): Promise<{ success: boolean }> => {
  return api.post('/shopping-list', { recipeId, items }).then(res => res.data);
};

export const getShoppingList = (recipeId: string): Promise<ShoppingItem[]> => {
  return api.get(`/shopping-list/${recipeId}`).then(res => res.data);
};
