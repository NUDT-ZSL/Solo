import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

export interface Mood {
  id: string;
  mood: string;
  note: string;
  tags: string[];
  createdAt: number;
}

export interface MoodConfig {
  emoji: string;
  label: string;
  value: number;
  color: string;
}

export const moodConfigs: Record<string, MoodConfig> = {
  happy: { emoji: '😊', label: '开心', value: 5, color: '#ffeaa7' },
  calm: { emoji: '😌', label: '平静', value: 4, color: '#81ecec' },
  sad: { emoji: '😢', label: '悲伤', value: 2, color: '#74b9ff' },
  angry: { emoji: '😠', label: '愤怒', value: 1, color: '#ff7675' },
  anxious: { emoji: '😰', label: '焦虑', value: 2, color: '#a29bfe' },
  tired: { emoji: '😴', label: '疲惫', value: 3, color: '#b2bec3' }
};

let moods: Mood[] = [];
let nextId = 1;

app.post('/api/moods', (req: Request, res: Response) => {
  const { mood, note, tags } = req.body;
  
  if (!mood || !moodConfigs[mood]) {
    return res.status(400).json({ error: '无效的情绪类型' });
  }
  
  if (tags && tags.length > 5) {
    return res.status(400).json({ error: '标签最多5个' });
  }

  const newMood: Mood = {
    id: String(nextId++),
    mood,
    note: note || '',
    tags: tags || [],
    createdAt: Date.now()
  };

  moods.unshift(newMood);
  res.status(201).json(newMood);
});

app.get('/api/moods', (_req: Request, res: Response) => {
  res.json(moods);
});

app.get('/api/moods/trend', (req: Request, res: Response) => {
  const { period } = req.query;
  const now = Date.now();
  const days = period === 'month' ? 30 : 7;
  const cutoff = now - days * 24 * 60 * 60 * 1000;

  const filtered = moods.filter(m => m.createdAt >= cutoff);
  
  const dailyData: Record<string, { total: number; count: number; moodCounts: Record<string, number> }> = {};
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dailyData[key] = { total: 0, count: 0, moodCounts: {} };
  }

  filtered.forEach(mood => {
    const date = new Date(mood.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (dailyData[key]) {
      const config = moodConfigs[mood.mood];
      dailyData[key].total += config.value;
      dailyData[key].count += 1;
      dailyData[key].moodCounts[mood.mood] = (dailyData[key].moodCounts[mood.mood] || 0) + 1;
    }
  });

  const trendData = Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: date.slice(5),
      value: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : null,
      count: data.count,
      moodCounts: data.moodCounts
    }));

  res.json({
    trendData,
    totalRecords: filtered.length,
    period
  });
});

app.delete('/api/moods/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = moods.findIndex(m => m.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '记录不存在' });
  }

  moods.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`MoodMirror server running on http://localhost:${PORT}`);
});
