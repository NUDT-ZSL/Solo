import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Step {
  id: number;
  audio: string;
  description: string;
}

interface Recipe {
  id: string;
  category: string;
  name: string;
  thumbnail: string;
  steps: Step[];
  funFacts: string[];
}

interface GameRecord {
  id: string;
  recipeId: string;
  recipeName: string;
  category: string;
  timeUsed: number;
  score: number;
  accuracy: number;
  timestamp: string;
}

interface GameStats {
  totalGames: number;
  averageAccuracy: number;
  highestScore: number;
}

const readJsonFile = <T>(filename: string): T => {
  const filePath = path.join(DATA_DIR, filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJsonFile = <T>(filename: string, data: T): void => {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/categories', (req: Request, res: Response) => {
  try {
    const categories = readJsonFile<Category[]>('categories.json');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read categories' });
  }
});

app.get('/api/recipes', (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const recipes = readJsonFile<Recipe[]>('recipes.json');
    
    if (category) {
      const filtered = recipes.filter(r => r.category === category);
      res.json(filtered);
    } else {
      res.json(recipes);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read recipes' });
  }
});

app.get('/api/recipes/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recipes = readJsonFile<Recipe[]>('recipes.json');
    const recipe = recipes.find(r => r.id === id);
    
    if (recipe) {
      res.json(recipe);
    } else {
      res.status(404).json({ error: 'Recipe not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read recipe' });
  }
});

app.get('/api/game-stats', (req: Request, res: Response) => {
  try {
    const records = readJsonFile<GameRecord[]>('game-records.json');
    
    const totalGames = records.length;
    const averageAccuracy = totalGames > 0
      ? records.reduce((sum, r) => sum + r.accuracy, 0) / totalGames
      : 0;
    const highestScore = totalGames > 0
      ? Math.max(...records.map(r => r.score))
      : 0;
    
    const stats: GameStats = {
      totalGames,
      averageAccuracy,
      highestScore,
    };
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate game stats' });
  }
});

app.get('/api/game-records', (req: Request, res: Response) => {
  try {
    const records = readJsonFile<GameRecord[]>('game-records.json');
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read game records' });
  }
});

app.post('/api/game-records', (req: Request, res: Response) => {
  try {
    const { recipeId, recipeName, category, timeUsed, score, accuracy } = req.body;
    
    if (!recipeId || !recipeName || !category || timeUsed === undefined || score === undefined || accuracy === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const records = readJsonFile<GameRecord[]>('game-records.json');
    
    const newRecord: GameRecord = {
      id: uuidv4(),
      recipeId,
      recipeName,
      category,
      timeUsed,
      score,
      accuracy,
      timestamp: new Date().toISOString(),
    };
    
    records.push(newRecord);
    writeJsonFile('game-records.json', records);
    
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create game record' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
