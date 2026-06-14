import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Recipe } from './src/types';
import { recipes, ingredients } from './src/mockData';

const app = express();
const PORT = 3002;

app.use(express.json());

app.get('/api/recipes', (req: Request, res: Response) => {
  const { search, ingredients: selectedIngredients, category } = req.query;
  
  let filteredRecipes: Recipe[] = [...recipes];
  
  if (search && typeof search === 'string') {
    const keyword = search.toLowerCase();
    filteredRecipes = filteredRecipes.filter(
      recipe =>
        recipe.name.toLowerCase().includes(keyword) ||
        recipe.description.toLowerCase().includes(keyword)
    );
  }
  
  if (selectedIngredients && typeof selectedIngredients === 'string') {
    const ingredientIds = selectedIngredients.split(',').filter(Boolean);
    if (ingredientIds.length > 0) {
      filteredRecipes = filteredRecipes.filter(recipe =>
        ingredientIds.every(id =>
          recipe.ingredients.some(ing => ing.ingredientId === id)
        )
      );
    }
  }
  
  if (category && typeof category === 'string' && category !== '全部') {
    filteredRecipes = filteredRecipes.filter(recipe => recipe.category === category);
  }
  
  res.json(filteredRecipes);
});

app.get('/api/ingredients', (req: Request, res: Response) => {
  res.json(ingredients);
});

app.get('/api/recipes/:id', (req: Request, res: Response) => {
  const recipe = recipes.find(r => r.id === req.params.id);
  if (recipe) {
    res.json(recipe);
  } else {
    res.status(404).json({ error: 'Recipe not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
