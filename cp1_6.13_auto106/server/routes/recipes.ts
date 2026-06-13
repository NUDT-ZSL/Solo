import { Router } from 'express';
import { recipeModel } from '../models/recipeModel.js';
import type { Recipe } from '../../src/types.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const startTime = Date.now();
    const recipes = await recipeModel.getAll();
    const duration = Date.now() - startTime;
    console.log(`[API] GET /api/recipes - ${duration}ms, ${recipes.length} recipes`);
    res.json(recipes);
  } catch (error) {
    console.error('[API] Error getting recipes:', error);
    res.status(500).json({ error: 'Failed to get recipes' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const startTime = Date.now();
    const ingredientsParam = req.query.ingredients as string;
    if (!ingredientsParam) {
      return res.status(400).json({ error: 'Ingredients parameter is required' });
    }

    const ingredients = ingredientsParam.split(',').filter(Boolean);
    const recipes = await recipeModel.searchByIngredients(ingredients);
    const duration = Date.now() - startTime;
    console.log(`[API] GET /api/recipes/search - ${duration}ms, matched ${recipes.length} recipes, ingredients: [${ingredients.join(', ')}]`);
    res.json(recipes);
  } catch (error) {
    console.error('[API] Error searching recipes:', error);
    res.status(500).json({ error: 'Failed to search recipes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, image, prepTime, ingredients, steps } = req.body as Recipe;
    if (!name || !prepTime || !ingredients || !steps) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const recipe = await recipeModel.create({ name, image, prepTime, ingredients, steps });
    console.log(`[API] POST /api/recipes - Created: ${recipe.name}`);
    res.status(201).json(recipe);
  } catch (error) {
    console.error('[API] Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

router.patch('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const { favorite } = req.body;
    const recipe = await recipeModel.toggleFavorite(id, favorite);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    console.log(`[API] PATCH /api/recipes/${id}/favorite - ${favorite}`);
    res.json(recipe);
  } catch (error) {
    console.error('[API] Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to update favorite' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await recipeModel.delete(id);
    if (removed === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    console.log(`[API] DELETE /api/recipes/${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

export default router;
