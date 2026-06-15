import express from 'express';
import cors from 'cors';
import { initDB, getAllSongs, getSongById, addHistoryRecord, getHistory } from './db.js';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

app.get('/api/songs', (_req, res) => {
  try {
    const songs = getAllSongs();
    res.json({ songs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

app.get('/api/songs/:id', (req, res) => {
  try {
    const song = getSongById(req.params.id);
    if (!song) {
      res.status(404).json({ error: 'Song not found' });
      return;
    }
    res.json({ song });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch song' });
  }
});

app.post('/api/history', (req, res) => {
  try {
    const { heart_rate, cadence, timestamp, calories } = req.body;
    if (heart_rate == null || cadence == null || timestamp == null || calories == null) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const id = addHistoryRecord({ heart_rate, cadence, timestamp, calories });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save history' });
  }
});

app.get('/api/history', (_req, res) => {
  try {
    const history = getHistory();
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
