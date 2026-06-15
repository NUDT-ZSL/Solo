import express from 'express';
import cors from 'cors';
import { db, Recipe } from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/ingredients', (req, res) => {
  try {
    const input = req.query.q as string;
    if (input) {
      const ingredients = db.matchIngredients(input);
      res.json(ingredients);
    } else {
      const ingredients = db.getAllIngredients();
      res.json(ingredients);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

app.get('/api/recipes', (req, res) => {
  try {
    const ingredients = req.query.ingredients as string;
    const query = req.query.q as string;
    
    let recipes: Recipe[] = [];
    
    if (ingredients) {
      const ingredientList = ingredients.split(',').map(i => i.trim());
      recipes = db.getRecipesByIngredients(ingredientList);
    } else if (query) {
      recipes = db.searchRecipes(query);
    } else {
      const allIngredients = db.getAllIngredients();
      const ingredientNames = allIngredients.map(i => i.name);
      recipes = db.getRecipesByIngredients(ingredientNames);
    }
    
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recipe = db.getRecipeById(id);
    if (recipe) {
      res.json(recipe);
    } else {
      res.status(404).json({ error: 'Recipe not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

app.get('/api/favorites', (req, res) => {
  try {
    const favorites = db.getFavorites();
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites', (req, res) => {
  try {
    const { recipeId, recipeName, cuisine, difficulty } = req.body;
    const favorite = db.addFavorite(recipeId, recipeName, cuisine, difficulty);
    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/favorites/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.removeFavorite(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
