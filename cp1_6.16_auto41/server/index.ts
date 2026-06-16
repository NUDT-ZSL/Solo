import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MATERIALS, generateRandomRecipe, Recipe } from '../src/logic/potionEngine';

const app = express();
const PORT = 3002;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

interface OperationRecord {
  id: string;
  recipeId: string;
  recipeName: string;
  success: boolean;
  timestamp: number;
  duration: number;
  materialsUsed: string[];
}

const records: OperationRecord[] = [];

app.get('/api/materials', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: MATERIALS
  });
});

app.get('/api/recipes', (req: Request, res: Response) => {
  const recipes: Recipe[] = [];
  for (let i = 0; i < 3; i++) {
    recipes.push(generateRandomRecipe());
  }
  res.json({
    success: true,
    data: recipes
  });
});

app.get('/api/recipe/random', (req: Request, res: Response) => {
  const recipe = generateRandomRecipe();
  res.json({
    success: true,
    data: recipe
  });
});

app.post('/api/records', (req: Request, res: Response) => {
  const { recipeId, recipeName, success, duration, materialsUsed } = req.body;

  const record: OperationRecord = {
    id: uuidv4(),
    recipeId,
    recipeName,
    success,
    timestamp: Date.now(),
    duration,
    materialsUsed: materialsUsed || []
  };

  records.push(record);

  res.json({
    success: true,
    data: record
  });
});

app.get('/api/records', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 20;
  const recentRecords = records.slice(-limit).reverse();
  res.json({
    success: true,
    data: recentRecords,
    total: records.length
  });
});

app.get('/api/stats', (req: Request, res: Response) => {
  const total = records.length;
  const successCount = records.filter(r => r.success).length;
  const successRate = total > 0 ? (successCount / total) * 100 : 0;

  res.json({
    success: true,
    data: {
      total,
      success: successCount,
      failure: total - successCount,
      successRate: Math.round(successRate * 10) / 10
    }
  });
});

app.listen(PORT, () => {
  console.log(`魔法学院药剂服务器运行在 http://localhost:${PORT}`);
});
