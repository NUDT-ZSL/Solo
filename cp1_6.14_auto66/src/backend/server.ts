import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTravelPlan } from './generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

interface PlanRequest {
  destination: string;
  days: number;
  preferences: string[];
  budget: string;
}

interface DatabaseSchema {
  plans: Array<{
    id: string;
    destination: string;
    days: number;
    preferences: string[];
    budget: string;
    dailyPlans: unknown[];
    createdAt: string;
  }>;
}

const dbFile = path.join(__dirname, 'data', 'plans.json');
const adapter = new JSONFile<DatabaseSchema>(dbFile);
const db = new Low<DatabaseSchema>(adapter, { plans: [] });

await db.read();
db.data ||= { plans: [] };
await db.write();

app.post('/api/generate-plan', async (req, res) => {
  try {
    const { destination, days, preferences, budget }: PlanRequest = req.body;

    if (!destination || !days || !preferences || !budget) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (days < 1 || days > 14) {
      return res.status(400).json({ error: '旅行天数必须在1-14天之间' });
    }

    const plan = generateTravelPlan(destination, days, preferences, budget);

    db.data!.plans.push(plan);
    await db.write();

    setTimeout(() => {
      res.json(plan);
    }, 1500 + Math.random() * 2000);
  } catch (error) {
    console.error('生成计划时出错:', error);
    res.status(500).json({ error: '生成计划失败，请重试' });
  }
});

app.get('/api/plans', async (_req, res) => {
  await db.read();
  res.json(db.data!.plans);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
