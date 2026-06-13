import express, { Request, Response } from 'express';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const leaderboardDb = Datastore.create({
  filename: path.join(__dirname, 'data', 'leaderboard.db'),
  autoload: true
});

app.get('/api/maze/config', (_req: Request, res: Response) => {
  res.json({
    width: 30,
    height: 30,
    itemTypes: ['chest', 'monster', 'exit'],
    chestCount: { min: 5, max: 10 },
    monsterCount: { min: 3, max: 7 },
    minBranches: 3,
    colors: {
      wall: '#334155',
      floor: '#f8fafc',
      chest: '#fbbf24',
      monster: '#ef4444',
      exit: '#22c55e',
      player: '#3b82f6'
    }
  });
});

app.get('/api/leaderboard', async (_req: Request, res: Response) => {
  try {
    const records = await leaderboardDb
      .find({})
      .sort({ time: 1, coins: -1 })
      .limit(10);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.post('/api/leaderboard', async (req: Request, res: Response) => {
  try {
    const { playerName, time, coins } = req.body;
    
    if (!playerName || typeof time !== 'number' || typeof coins !== 'number') {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const record = {
      playerName,
      time,
      coins,
      date: new Date().toISOString()
    };

    const result = await leaderboardDb.insert(record);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save record' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
