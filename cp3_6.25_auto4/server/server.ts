import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, RecipeStep, Recommendation } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3005;
const DATA_FILE = path.join(__dirname, 'recipes.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

function readRecipes(): Recipe[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading recipes:', err);
    return [];
  }
}

function writeRecipes(recipes: Recipe[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing recipes:', err);
    throw err;
  }
}

function calculateRecipeStats(recipe: Recipe): Recipe {
  const totalDuration = recipe.steps.reduce((acc, step) => acc + step.duration, 0);
  const averageRating = recipe.steps.length > 0
    ? recipe.steps.reduce((acc, step) => acc + step.rating, 0) / recipe.steps.length
    : 0;
  return {
    ...recipe,
    totalDuration,
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\w\u4e00-\u9fa5]+/g) || [];
}

function getWordFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

function cosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const freqA = getWordFrequency(tokensA);
  const freqB = getWordFrequency(tokensB);

  const allWords = new Set([...freqA.keys(), ...freqB.keys()]);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const word of allWords) {
    const a = freqA.get(word) || 0;
    const b = freqB.get(word) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateRecipeSimilarity(recipeA: Recipe, recipeB: Recipe): number {
  if (recipeA.steps.length === 0 || recipeB.steps.length === 0) return 0;

  const allDescriptionsA = recipeA.steps.map(s => s.description).join(' ');
  const allDescriptionsB = recipeB.steps.map(s => s.description).join(' ');

  return cosineSimilarity(allDescriptionsA, allDescriptionsB);
}

function clusterRecipes(
  currentRecipe: Recipe,
  allRecipes: Recipe[],
  threshold: number = 0.6
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const recipe of allRecipes) {
    if (recipe.id === currentRecipe.id) continue;

    const similarity = calculateRecipeSimilarity(currentRecipe, recipe);

    if (similarity >= threshold) {
      recommendations.push({ recipe, similarity });
    }
  }

  return recommendations
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

app.get('/api/recipes', (req, res) => {
  try {
    const recipes = readRecipes();
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recipes = readRecipes();
    const recipe = recipes.find(r => r.id === id);

    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

app.post('/api/recipes', (req, res) => {
  try {
    const recipeData = req.body as Partial<Recipe>;
    const recipes = readRecipes();

    const newRecipe: Recipe = {
      id: uuidv4(),
      name: recipeData.name || '未命名菜谱',
      createdAt: recipeData.createdAt || new Date().toISOString(),
      steps: recipeData.steps || [],
      totalDuration: 0,
      averageRating: 0,
    };

    const savedRecipe = calculateRecipeStats(newRecipe);
    recipes.push(savedRecipe);
    writeRecipes(recipes);

    res.status(201).json(savedRecipe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

app.put('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body as Recipe;
    const recipes = readRecipes();

    const index = recipes.findIndex(r => r.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    const updatedRecipe = calculateRecipeStats({
      ...recipes[index],
      ...updatedData,
      id,
    });

    recipes[index] = updatedRecipe;
    writeRecipes(recipes);

    res.json(updatedRecipe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

app.delete('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recipes = readRecipes();

    const filtered = recipes.filter(r => r.id !== id);
    if (filtered.length === recipes.length) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    writeRecipes(filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

app.post('/api/recipes/:id/rating', (req, res) => {
  try {
    const { id } = req.params;
    const { stepId, rating } = req.body as { stepId: string; rating: number };
    const recipes = readRecipes();

    const index = recipes.findIndex(r => r.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    const recipe = recipes[index];
    const stepIndex = recipe.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      res.status(404).json({ error: 'Step not found' });
      return;
    }

    recipe.steps[stepIndex].rating = rating;
    const updatedRecipe = calculateRecipeStats(recipe);
    recipes[index] = updatedRecipe;
    writeRecipes(recipes);

    res.json(updatedRecipe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rating' });
  }
});

app.post('/api/recipes/:id/recommend', (req, res) => {
  try {
    const { id } = req.params;
    const recipes = readRecipes();

    const currentRecipe = recipes.find(r => r.id === id);
    if (!currentRecipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    const recommendations = clusterRecipes(currentRecipe, recipes, 0.6);
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});

export default app;
