import axios from 'axios';
import type { Recipe } from '../types';

const API_BASE = '/api/recipes';

export const recipeApi = {
  async getAll(): Promise<Recipe[]> {
    const startTime = performance.now();
    const response = await axios.get<Recipe[]>(API_BASE);
    const duration = performance.now() - startTime;
    console.log(`[Performance] getAll recipes: ${duration.toFixed(2)}ms`);
    return response.data;
  },

  async searchByIngredients(ingredients: string[]): Promise<Recipe[]> {
    const startTime = performance.now();
    const response = await axios.get<Recipe[]>(`${API_BASE}/search`, {
      params: { ingredients: ingredients.join(',') },
    });
    const duration = performance.now() - startTime;
    console.log(`[Performance] searchByIngredients: ${duration.toFixed(2)}ms${duration <= 300 ? ' ✓ (<=300ms target' : ' ✗ (>300ms target')}`);
    return response.data;
  },

  async create(recipe: Omit<Recipe, '_id' | 'favorite' | 'createdAt'>): Promise<Recipe> {
    const response = await axios.post<Recipe>(API_BASE, recipe);
    return response.data;
  },

  async toggleFavorite(id: string, favorite: boolean): Promise<Recipe> {
    const response = await axios.patch<Recipe>(`${API_BASE}/${id}/favorite`, { favorite });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE}/${id}`);
  },
};
