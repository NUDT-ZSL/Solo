import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { presetIngredients } from './data/ingredients';
import { recipeTemplates } from './data/templates';
import { SaveRecipeRequest, SaveRecipeResponse } from '../src/lib/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const savedRecipes: SaveRecipeRequest[] = [];

app.get('/api/ingredients', (_req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      data: presetIngredients,
    });
  }, 50);
});

app.get('/api/templates', (_req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      data: recipeTemplates,
    });
  }, 50);
});

app.get('/api/saved', (_req, res) => {
  res.json({
    success: true,
    data: savedRecipes,
  });
});

app.post('/api/save', (req, res) => {
  const body: SaveRecipeRequest = req.body;
  
  if (!body.name || !body.steps) {
    return res.status(400).json({
      success: false,
      message: '缺少必要字段',
      id: '',
    });
  }

  const recipeId = uuidv4();
  const savedRecipe = { ...body, id: recipeId, createdAt: new Date().toISOString() };
  savedRecipes.push(savedRecipe);

  setTimeout(() => {
    const response: SaveRecipeResponse = {
      success: true,
      message: '配方保存成功',
      id: recipeId,
    };
    res.json(response);
  }, 50);
});

app.listen(PORT, () => {
  console.log(`🍰 烘焙配方后端服务器运行在 http://localhost:${PORT}`);
});

export default app;
