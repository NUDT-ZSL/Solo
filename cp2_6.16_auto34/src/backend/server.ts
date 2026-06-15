import express from 'express';
import cors from 'cors';
import { db, Recipe } from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let dbReady = false;
let initPromise: Promise<void> | null = null;

const initDatabase = async () => {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await db.init();
      dbReady = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  })();
  return initPromise;
};

const waitForDb = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (dbReady) {
    next();
  } else {
    initDatabase()
      .then(() => next())
      .catch(() => res.status(500).json({ error: 'Database initialization failed' }));
  }
};

app.use(waitForDb);

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
    console.error('Error fetching ingredients:', error);
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
    console.error('Error fetching recipes:', error);
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
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

app.get('/api/favorites', (req, res) => {
  try {
    const favorites = db.getFavorites();
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites', (req, res) => {
  try {
    const { recipeId, recipeName, cuisine, difficulty } = req.body;
    const favorite = db.addFavorite(recipeId, recipeName, cuisine, difficulty);
    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/favorites/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.removeFavorite(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
