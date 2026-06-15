import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Rating, CategoryStats, RatingsResponse, Category } from './shared/types';
import { CATEGORIES } from './shared/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let ratings: Rating[] = [];

function calculateStats(ratings: Rating[]): CategoryStats[] {
  return CATEGORIES.map((category) => {
    const categoryRatings = ratings.filter((r) => r.category === category);
    const count = categoryRatings.length;
    const scores = categoryRatings.map((r) => r.score);
    const sortedByTime = [...categoryRatings].sort((a, b) => b.timestamp - a.timestamp);
    const recentScores = sortedByTime.slice(0, 5).map((r) => r.score);

    const average = count > 0 ? scores.reduce((sum, s) => sum + s, 0) / count : 0;

    const volatilityScores = recentScores.length > 0 ? recentScores : scores;
    const volatilityCount = volatilityScores.length;
    let volatility = 0;

    if (volatilityCount > 0) {
      const mean = volatilityScores.reduce((sum, s) => sum + s, 0) / volatilityCount;
      const squaredDiffs = volatilityScores.map((s) => Math.pow(s - mean, 2));
      const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / volatilityCount;
      volatility = Math.sqrt(variance);
    }

    return {
      category,
      average,
      volatility,
      count,
      recentScores,
    };
  });
}

app.get('/api/ratings', (_req, res) => {
  const stats = calculateStats(ratings);
  const recentRatings = [...ratings].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  const response: RatingsResponse = {
    ratings,
    stats,
    recentRatings,
  };

  res.json(response);
});

app.post('/api/ratings', (req, res) => {
  const { category, score, comment } = req.body;

  if (!CATEGORIES.includes(category as Category)) {
    return res.status(400).json({ error: '无效的分类' });
  }

  if (typeof score !== 'number' || score < 1 || score > 5) {
    return res.status(400).json({ error: '分数必须在 1-5 之间' });
  }

  const newRating: Rating = {
    id: uuidv4(),
    category: category as Category,
    score,
    comment,
    timestamp: Date.now(),
  };

  ratings.push(newRating);

  const stats = calculateStats(ratings);
  const recentRatings = [...ratings].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  const response: RatingsResponse = {
    ratings,
    stats,
    recentRatings,
  };

  res.json(response);
});

app.delete('/api/ratings', (_req, res) => {
  ratings = [];

  const stats = calculateStats(ratings);
  const recentRatings: Rating[] = [];

  const response: RatingsResponse = {
    ratings,
    stats,
    recentRatings,
  };

  res.json(response);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
