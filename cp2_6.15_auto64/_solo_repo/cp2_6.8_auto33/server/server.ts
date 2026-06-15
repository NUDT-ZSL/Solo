import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MOODS_FILE = path.join(DATA_DIR, 'moods.json');
const SONGS_FILE = path.join(DATA_DIR, 'songs.json');

app.use(cors());
app.use(express.json());

interface Mood {
  id: string;
  emotion: string;
  note: string;
  timestamp: number;
}

interface LyricLine {
  time: number;
  text: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  emotion: string;
  lyrics: LyricLine[];
}

function readJSON<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJSON<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

app.get('/api/moods', (_req, res) => {
  try {
    const moods = readJSON<Mood[]>(MOODS_FILE);
    res.json(moods.sort((a, b) => b.timestamp - a.timestamp));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read moods' });
  }
});

app.post('/api/moods', (req, res) => {
  try {
    const { emotion, note = '' } = req.body;
    if (!emotion) {
      res.status(400).json({ error: 'Emotion is required' });
      return;
    }
    const moods = readJSON<Mood[]>(MOODS_FILE);
    const newMood: Mood = {
      id: uuidv4(),
      emotion,
      note,
      timestamp: Date.now(),
    };
    moods.push(newMood);
    writeJSON(MOODS_FILE, moods);
    res.status(201).json(newMood);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save mood' });
  }
});

app.delete('/api/moods/:id', (req, res) => {
  try {
    const { id } = req.params;
    const moods = readJSON<Mood[]>(MOODS_FILE);
    const filtered = moods.filter((m) => m.id !== id);
    if (filtered.length === moods.length) {
      res.status(404).json({ error: 'Mood not found' });
      return;
    }
    writeJSON(MOODS_FILE, filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete mood' });
  }
});

app.get('/api/songs/:emotion', (req, res) => {
  try {
    const { emotion } = req.params;
    const allSongs = readJSON<Song[]>(SONGS_FILE);
    const filtered = allSongs.filter((s) => s.emotion === emotion);
    if (filtered.length === 0) {
      const shuffled = [...allSongs].sort(() => Math.random() - 0.5).slice(0, 20);
      res.json(shuffled);
      return;
    }
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    res.json(shuffled);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

app.get('/api/stats/weekly', (_req, res) => {
  try {
    const moods = readJSON<Mood[]>(MOODS_FILE);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const heatmap: { date: string; hour: number; emotion: string; count: number }[] = [];
    const playHistory: { date: string; count: number }[] = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dateStr = formatDate(day);
      playHistory.push({ date: dateStr, count: 0 });
    }

    const dayMap = new Map<string, number>();
    const hourMap = new Map<string, { emotion: string; count: number }>();

    moods.forEach((mood) => {
      const date = new Date(mood.timestamp);
      const dateStr = formatDate(date);
      const hour = date.getHours();
      const key = `${dateStr}-${hour}`;

      if (date >= weekStart) {
        const dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
        if (hourMap.has(key)) {
          const existing = hourMap.get(key)!;
          existing.count += 1;
        } else {
          hourMap.set(key, { emotion: mood.emotion, count: 1 });
        }
      }
    });

    playHistory.forEach((item) => {
      item.count = dayMap.get(item.date) || 0;
    });

    hourMap.forEach((value, key) => {
      const [dateStr, hourStr] = key.split('-');
      const hour = parseInt(hourStr, 10);
      heatmap.push({
        date: dateStr,
        hour,
        emotion: value.emotion,
        count: value.count,
      });
    });

    res.json({ heatmap, playHistory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
