import { Router } from 'express';
import { mockBatches } from '../data/mockData';
import type { StatsData } from '../../src/types';

const router = Router();

router.get('/', (_req, res) => {
  const monthlyData = new Map<string, number>();
  const levelScores = new Map<string, { total: number; count: number }>();

  mockBatches.forEach(batch => {
    const month = batch.roastDate.substring(0, 7);
    monthlyData.set(month, (monthlyData.get(month) || 0) + 1);

    const existing = levelScores.get(batch.roastLevel) || { total: 0, count: 0 };
    levelScores.set(batch.roastLevel, {
      total: existing.total + batch.score,
      count: existing.count + 1,
    });
  });

  const monthlyBatches = Array.from(monthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const roastLevelAvgScores = Array.from(levelScores.entries()).map(([level, data]) => ({
    level,
    avgScore: Math.round((data.total / data.count) * 10) / 10,
  }));

  const stats: StatsData = {
    monthlyBatches,
    roastLevelAvgScores,
  };

  res.json(stats);
});

export default router;
