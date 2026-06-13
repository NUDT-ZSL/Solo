import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, '..', 'db', 'scores.db');
const db = Datastore.create({ filename: dbPath, autoload: true });

app.get('/api/scores', async (_req, res) => {
  try {
    const scores = await db.find({})
      .sort({ score: -1 })
      .limit(10)
      .projection({ name: 1, score: 1, date: 1, _id: 0 });
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

app.post('/api/scores', async (req, res) => {
  try {
    const { name, score } = req.body;
    if (!name || typeof score !== 'number') {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const entry = {
      id: uuidv4(),
      name: String(name).slice(0, 10),
      score: Number(score),
      date: new Date().toISOString(),
    };
    await db.insert(entry);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
