require('ts-node/register');
const express = require('express');
const cors = require('cors');
const path = require('path');

const { INGREDIENT_LIBRARY, RECIPES, getRecipeById, getAllRecipes } = require('./recipesData.ts');
const { matchRecipes } = require('./matchingEngine.ts');
const { generateShoppingList, generateShoppingListForSingleRecipe } = require('./shoppingList.ts');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/ingredients', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  let suggestions = INGREDIENT_LIBRARY;
  if (query) {
    suggestions = INGREDIENT_LIBRARY.filter(ing =>
      ing.toLowerCase().includes(query)
    );
  }
  res.json(suggestions.slice(0, 10));
});

app.get('/api/recipes', (req, res) => {
  res.json(getAllRecipes());
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = getRecipeById(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '食谱未找到' });
  }
  res.json(recipe);
});

app.post('/api/match', (req, res) => {
  const startTime = Date.now();
  const { ingredients } = req.body;
  
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: '请提供食材列表' });
  }
  
  const results = matchRecipes(ingredients);
  const elapsed = Date.now() - startTime;
  
  console.log(`匹配完成，用时: ${elapsed}ms，返回 ${results.length} 个食谱`);
  
  res.json({
    matches: results,
    processingTime: elapsed
  });
});

app.post('/api/shopping-list', (req, res) => {
  const { recipeIds, recipeId, ingredients } = req.body;
  
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: '请提供食材列表' });
  }
  
  let shoppingList;
  
  if (recipeIds && Array.isArray(recipeIds)) {
    shoppingList = generateShoppingList(recipeIds, ingredients);
  } else if (recipeId) {
    shoppingList = generateShoppingListForSingleRecipe(recipeId, ingredients);
  } else {
    return res.status(400).json({ error: '请提供食谱ID或食谱ID列表' });
  }
  
  res.json({
    shoppingList,
    totalItems: shoppingList.length
  });
});

app.listen(PORT, () => {
  console.log(`食谱小助手后端服务已启动: http://localhost:${PORT}`);
  console.log(`已加载 ${RECIPES.length} 个食谱和 ${INGREDIENT_LIBRARY.length} 种食材`);
});
