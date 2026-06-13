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
    const moodNum = Number(mood);
    if (isNaN(moodNum) || moodNum < 1 || moodNum > 10) {
      return res.status(400).json({ error: 'mood must be between 1 and 10' });
    }
    const entry = {
      id: uuidv4(),
      mood: moodNum,
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
      query = { date: String(date) };
    } else if (start && end) {
      query = { date: { $gte: String(start), $lte: String(end) } };
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

function getDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

app.get('/api/stats/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startStr = getDateStr(sevenDaysAgo);
    const endStr = getDateStr(today);

    const entries = await db
      .find({ date: { $gte: startStr, $lte: endStr } })
      .sort({ date: 1 })
      .exec();

    const dailyMap: Record<string, { moods: number[]; notes: string[] }> = {};
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
      const dateStr = getDateStr(cur);
      const data = dailyMap[dateStr];
      daily.push({
        date: dateStr,
        avgMood: data ? Math.round((data.moods.reduce((a, b) => a + b, 0) / data.moods.length) * 10) / 10 : null,
        count: data ? data.moods.length : 0,
        notes: data ? data.notes : [],
      });
      cur.setDate(cur.getDate() + 1);
    }

    const allMoods = entries.map((e) => e.mood);
    const overallAvg =
      allMoods.length > 0
        ? Math.round((allMoods.reduce((a, b) => a + b, 0) / allMoods.length) * 100) / 100
        : null;

    const weekStart = getDateStr(sevenDaysAgo);
    const weekEnd = getDateStr(today);

    const weekHigh = allMoods.length > 0 ? Math.max(...allMoods) : null;
    const weekLow = allMoods.length > 0 ? Math.min(...allMoods) : null;

    const weekDaysWithData = daily.filter((d) => d.count > 0).length;

    res.json({
      daily,
      overallAvg,
      totalEntries: entries.length,
      weekStart,
      weekEnd,
      weekHigh,
      weekLow,
      weekDaysWithData,
      weekTotalDays: 7,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute summary' });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const numRemoved = await db.remove({ id: req.params.id });
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

app.listen(PORT, () => {
  console.log(`MindPalette server running on http://localhost:${PORT}`);
});
