import express from 'express';
import cors from 'cors';
import {
  getAllRecipes,
  getAllIngredients,
  getPreferences,
  updatePreferences,
  UserPreference
} from './db';
import { matchRecipes, getRecommendations } from './recipeMatcher';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/ingredients', async (_req, res) => {
  try {
    const ingredients = await getAllIngredients();
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

app.get('/api/recipes', async (req, res) => {
  try {
    const ingredientsParam = req.query.ingredients as string;
    const ingredients = ingredientsParam
      ? ingredientsParam.split(',').filter(Boolean)
      : [];

    const [recipes, preferences] = await Promise.all([
      getAllRecipes(),
      getPreferences()
    ]);

    const matched = matchRecipes(recipes, ingredients, preferences);

    const recentIngredients =
      preferences.searchHistory.length > 0
        ? preferences.searchHistory[preferences.searchHistory.length - 1]
        : ingredients;
    const recommendations = getRecommendations(recipes, preferences, recentIngredients);

    if (ingredients.length > 0) {
      await updatePreferences((prefs: UserPreference) => {
        prefs.searchHistory.push(ingredients);
        if (prefs.searchHistory.length > 20) {
          prefs.searchHistory.shift();
        }
      });
    }

    res.json({
      recipes: matched,
      recommendations
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

app.get('/api/preferences', async (_req, res) => {
  try {
    const preferences = await getPreferences();
    const recipes = await getAllRecipes();

    const favoriteRecipesWithDetails = preferences.favoriteRecipes
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .map((fav) => {
        const recipe = recipes.find((r) => r.id === fav.recipeId);
        return recipe
          ? {
              ...fav,
              name: recipe.name
            }
          : fav;
      });

    res.json({
      ...preferences,
      favoriteRecipes: favoriteRecipesWithDetails
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

app.post('/api/preferences', async (req, res) => {
  try {
    const { favoriteRecipes, ratings, searchHistory } = req.body as Partial<UserPreference> & {
      favoriteRecipes?: Array<{ recipeId: string; addedAt?: string }>;
    };

    const updated = await updatePreferences((prefs: UserPreference) => {
      if (favoriteRecipes !== undefined) {
        prefs.favoriteRecipes = favoriteRecipes.map((f) => ({
          recipeId: f.recipeId,
          addedAt: f.addedAt || new Date().toISOString()
        }));
      }
      if (ratings !== undefined) {
        prefs.ratings = { ...prefs.ratings, ...ratings };
      }
      if (searchHistory !== undefined) {
        prefs.searchHistory = searchHistory;
      }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

app.post('/api/preferences/rate', async (req, res) => {
  try {
    const { recipeId, rating } = req.body as { recipeId: string; rating: number };
    if (!recipeId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating data' });
    }

    const updated = await updatePreferences((prefs: UserPreference) => {
      prefs.ratings[recipeId] = rating;
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to rate recipe' });
  }
});

app.post('/api/preferences/favorite', async (req, res) => {
  try {
    const { recipeId, favorited } = req.body as { recipeId: string; favorited: boolean };
    if (!recipeId) {
      return res.status(400).json({ error: 'Invalid recipe id' });
    }

    const updated = await updatePreferences((prefs: UserPreference) => {
      const exists = prefs.favoriteRecipes.findIndex((f) => f.recipeId === recipeId);
      if (favorited && exists === -1) {
        prefs.favoriteRecipes.push({
          recipeId,
          addedAt: new Date().toISOString()
        });
      } else if (!favorited && exists !== -1) {
        prefs.favoriteRecipes.splice(exists, 1);
      }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update favorite' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`FlavorVault API server running on port ${PORT}`);
});

export default app;
