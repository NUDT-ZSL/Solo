import express, { Request, Response } from 'express';
import cors from 'cors';
import { initDatabase, getAllMemories, getMemoriesByYear, addMemory, Memory } from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

app.get('/api/memories', async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    let memories: Memory[];

    if (year) {
      const yearNum = parseInt(year as string, 10);
      if (isNaN(yearNum)) {
        return res.status(400).json({ success: false, error: 'Invalid year parameter' });
      }
      memories = await getMemoriesByYear(yearNum);
    } else {
      memories = await getAllMemories();
    }

    res.json({ success: true, data: memories });
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch memories' });
  }
});

app.post('/api/memories', async (req: Request, res: Response) => {
  try {
    const { title, description, image_url, mood, latitude, longitude } = req.body;

    if (!title || !description || !image_url || !mood || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const validMoods = ['happy', 'sad', 'surprised', 'calm', 'nostalgic'];
    if (!validMoods.includes(mood)) {
      return res.status(400).json({ success: false, error: 'Invalid mood value' });
    }

    const newMemory = await addMemory({ title, description, image_url, mood, latitude, longitude });
    res.status(201).json({ success: true, data: newMemory });
  } catch (error) {
    console.error('Error adding memory:', error);
    res.status(500).json({ success: false, error: 'Failed to add memory' });
  }
});

app.listen(PORT, () => {
  console.log(`MemoirMap API server running on http://localhost:${PORT}`);
});
