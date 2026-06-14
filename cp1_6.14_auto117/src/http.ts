import axios from 'axios';
import type { Recipe, RecipeDetail, ShoppingListResponse, Ingredient } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const getRecipes = (ingredients: string): Promise<Recipe[]> => {
  return api
    .get('/recipes', { params: { ingredients } })
    .then(res => res.data);
};

export const getRecipeById = (id: number): Promise<RecipeDetail> => {
  return api
    .get(`/recipes/${id}/details`)
    .then(res => res.data);
};

export const generateShoppingList = (
  recipeId: number,
  ingredients: Ingredient[],
  ownedAmounts: Record<number, number>
): Promise<ShoppingListResponse> => {
  return api
    .post('/shopping-list', { recipeId, ingredients, ownedAmounts })
    .then(res => res.data);
};

export default api;
