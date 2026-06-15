import express from 'express';
import cors from 'cors';
import { insertHistory, getAllHistory, deleteHistory } from './db';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/history', (req, res) => {
  try {
    const rows = getAllHistory();
    const items = rows.map((r) => ({
      id: r.id,
      melody: JSON.parse(r.melody),
      chords: JSON.parse(r.chords),
      melodyText: r.melody_text,
      createdAt: r.created_at,
    }));
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/history', (req, res) => {
  try {
    const { melody, chords, melodyText } = req.body;
    if (!melody || !chords) {
      res.status(400).json({ success: false, error: 'melody and chords are required' });
      return;
    }
    const id = insertHistory(
      JSON.stringify(melody),
      JSON.stringify(chords),
      melodyText || '',
    );
    res.json({ success: true, data: { id } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/history/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid id' });
      return;
    }
    deleteHistory(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
