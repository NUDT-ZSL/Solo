import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Datastore({
  filename: path.join(dataDir, 'entries.db'),
  autoload: true,
});

app.post('/api/entries', async (req, res) => {
  try {
    const { mood, note, date } = req.body;
    if (mood === undefined || mood === null) {
      return res.status(400).json({ error: 'mood is required' });
    }
    const entry = {
      id: uuidv4(),
      mood: Number(mood),
      note: note || '',
      date: date || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    const doc = await db.insert(entry);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

app.get('/api/entries', async (req, res) => {
  try {
    const { date, start, end } = req.query;
    let query = {};
    if (date) {
      query.date = date;
    } else if (start && end) {
      query.date = { $gte: String(start), $lte: String(end) };
    }
    const entries = await db.find(query).sort({ date: 1, createdAt: 1 }).exec();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

app.get('/api/entries/all', async (req, res) => {
  try {
    const entries = await db.find({}).sort({ date: 1, createdAt: 1 }).exec();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

app.get('/api/stats/summary', async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startStr = sevenDaysAgo.toISOString().slice(0, 10);
    const endStr = today.toISOString().slice(0, 10);

    const entries = await db
      .find({ date: { $gte: startStr, $lte: endStr } })
      .sort({ date: 1 })
      .exec();

    const dailyMap = {};
    entries.forEach((e) => {
      if (!dailyMap[e.date]) {
        dailyMap[e.date] = { moods: [], notes: [] };
      }
      dailyMap[e.date].moods.push(e.mood);
      if (e.note) dailyMap[e.date].notes.push(e.note);
    });

    const daily = [];
    const cur = new Date(sevenDaysAgo);
    while (cur <= today) {
      const dateStr = cur.toISOString().slice(0, 10);
      const data = dailyMap[dateStr];
      daily.push({
        date: dateStr,
        avgMood: data ? data.moods.reduce((a, b) => a + b, 0) / data.moods.length : null,
        count: data ? data.moods.length : 0,
        notes: data ? data.notes : [],
      });
      cur.setDate(cur.getDate() + 1);
    }

    const allMoods = entries.map((e) => e.mood);
    const overallAvg =
      allMoods.length > 0 ? allMoods.reduce((a, b) => a + b, 0) / allMoods.length : null;

    res.json({ daily, overallAvg, totalEntries: entries.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute summary' });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    await db.remove({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

app.listen(PORT, () => {
  console.log(`MindPalette server running on http://localhost:${PORT}`);
});
