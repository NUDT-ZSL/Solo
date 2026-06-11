import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Rating {
  id: string;
  category: string;
  score: number;
  note: string;
  timestamp: number;
}

interface CategoryStats {
  category: string;
  average: number;
  count: number;
  volatility: number;
  recentScores: number[];
}

const CATEGORIES = ['技术协作', '创新能力', '响应速度', '文档质量', '沟通效率'];

let ratings: Rating[] = [];

function calcStats(): CategoryStats[] {
  return CATEGORIES.map((category) => {
    const catRatings = ratings.filter((r) => r.category === category);
    const scores = catRatings.map((r) => r.score);
    const count = scores.length;
    const average = count > 0 ? scores.reduce((a, b) => a + b, 0) / count : 0;
    const recentScores = scores.slice(-5);
    let volatility = 0;
    if (recentScores.length >= 2) {
      const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const variance = recentScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / recentScores.length;
      volatility = Math.sqrt(variance);
    }
    return { category, average, count, volatility, recentScores };
  });
}

app.post('/api/ratings', (req, res) => {
  const { category, score, note } = req.body;
  if (!CATEGORIES.includes(category) || typeof score !== 'number' || score < 1 || score > 5) {
    res.status(400).json({ error: 'Invalid rating data' });
    return;
  }
  const rating: Rating = {
    id: uuidv4(),
    category,
    score,
    note: (note || '').slice(0, 100),
    timestamp: Date.now(),
  };
  ratings.push(rating);
  res.json({ success: true, rating });
});

app.get('/api/ratings', (_req, res) => {
  res.json({ ratings, stats: calcStats() });
});

app.delete('/api/ratings', (_req, res) => {
  ratings = [];
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
