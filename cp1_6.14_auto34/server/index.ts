import express from 'express';
import cors from 'cors';
import { getDb, type Recipe } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/recipes', async (req, res) => {
  const db = await getDb();
  const { category, keyword } = req.query;
  let recipes = db.data.recipes;
  if (category && category !== '全部') {
    recipes = recipes.filter((r) => r.category === category);
  }
  if (keyword && typeof keyword === 'string') {
    const kw = keyword.toLowerCase();
    recipes = recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(kw) ||
        r.description.toLowerCase().includes(kw) ||
        r.ingredients.some((ing) => ing.toLowerCase().includes(kw))
    );
  }
  res.json(recipes);
});

app.get('/api/recipes/:id', async (req, res) => {
  const db = await getDb();
  const recipe = db.data.recipes.find((r) => r.id === req.params.id);
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  res.json(recipe);
});

app.post('/api/recipes', async (req, res) => {
  const db = await getDb();
  const recipe: Recipe = {
    id: crypto.randomUUID(),
    name: req.body.name || '',
    description: req.body.description || '',
    category: req.body.category || '中式',
    cookTime: req.body.cookTime || '30分钟',
    ingredients: req.body.ingredients || [],
    steps: req.body.steps || [],
    rating: 0,
    ratingCount: 0,
    favorite: false,
    notes: '',
    gradient: req.body.gradient || 'linear-gradient(135deg, #f97316, #fbbf24)',
  };
  db.data.recipes.push(recipe);
  await db.write();
  res.status(201).json(recipe);
});

app.put('/api/recipes/:id', async (req, res) => {
  const db = await getDb();
  const idx = db.data.recipes.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  const existing = db.data.recipes[idx];
  if (req.body.rating !== undefined) {
    const newRating = req.body.rating;
    const oldTotal = existing.rating * existing.ratingCount;
    existing.ratingCount += 1;
    existing.rating = Math.round(((oldTotal + newRating) / existing.ratingCount) * 10) / 10;
  }
  if (req.body.notes !== undefined) {
    existing.notes = req.body.notes;
  }
  if (req.body.favorite !== undefined) {
    existing.favorite = req.body.favorite;
  }
  db.data.recipes[idx] = existing;
  await db.write();
  res.json(existing);
});

app.post('/api/recommend', async (req, res) => {
  const db = await getDb();
  const { ingredients } = req.body;
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    res.status(400).json({ error: 'Please provide ingredients array' });
    return;
  }
  const normalizedInput = ingredients.map((i: string) => i.trim().toLowerCase());
  const scored = db.data.recipes
    .map((recipe) => {
      const matched = recipe.ingredients.filter((ing) =>
        normalizedInput.some((input: string) => ing.toLowerCase().includes(input) || input.includes(ing.toLowerCase()))
      );
      return { recipe, matchCount: matched.length, matchedIngredients: matched };
    })
    .filter((item) => item.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 10);
  res.json(
    scored.map((item) => ({
      ...item.recipe,
      matchedIngredients: item.matchedIngredients,
      matchCount: item.matchCount,
    }))
  );
});

app.listen(PORT, async () => {
  await getDb();
  console.log(`RecipeVault server running on http://localhost:${PORT}`);
});
