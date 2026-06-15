import { Router, Request, Response } from 'express';
import { db } from '../index';

const router = Router();

interface TransactionRow {
  date: string;
  type: string;
  quantity: number;
}

router.get('/prediction', (req: Request, res: Response) => {
  const days = Math.min(30, Math.max(1, parseInt(req.query.days as string, 10) || 7));
  const factor = Math.min(2.0, Math.max(0.5, parseFloat(req.query.factor as string) || 1.2));

  const items = db.prepare('SELECT id, name, category, quantity FROM inventory_items').all() as { id: string; name: string; category: string; quantity: number }[];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  cutoffDate.setHours(0, 0, 0, 0);

  const getTransactionsForItem = db.prepare(
    'SELECT date, type, quantity FROM inventory_transactions WHERE item_id = ? ORDER BY date ASC'
  );

  const predictions = items.map((item) => {
    const transactions = getTransactionsForItem.all(item.id) as TransactionRow[];

    const dailyConsumption: Map<string, number> = new Map();
    let recentConsumption = 0;

    for (const tx of transactions) {
      const txDate = new Date(tx.date);
      const dayKey = txDate.toISOString().split('T')[0];

      if (tx.type === 'out') {
        dailyConsumption.set(dayKey, (dailyConsumption.get(dayKey) || 0) + tx.quantity);
        if (txDate >= cutoffDate) {
          recentConsumption += tx.quantity;
        }
      }
    }

    const dailyValues = Array.from(dailyConsumption.values());

    if (dailyValues.length === 0) {
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        recentConsumption: 0,
        predictedConsumption: 0,
        suggestedReplenishment: 0,
      };
    }

    const sma = dailyValues.reduce((sum, v) => sum + v, 0) / dailyValues.length;

    let trendSlope = 0;
    if (dailyValues.length >= 2) {
      const n = dailyValues.length;
      const xMean = (n - 1) / 2;
      const yMean = dailyValues.reduce((s, v) => s + v, 0) / n;
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (dailyValues[i] - yMean);
        denominator += (i - xMean) * (i - xMean);
      }
      trendSlope = denominator !== 0 ? numerator / denominator : 0;
    }

    const trendPredictedDaily = sma + trendSlope;
    const blendedDailyRate = 0.6 * sma + 0.4 * Math.max(0, trendPredictedDaily);

    const predictedConsumption = Math.round(blendedDailyRate * days);
    const suggestedReplenishment = Math.max(0, Math.round(predictedConsumption * factor - item.quantity));

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      recentConsumption,
      predictedConsumption,
      suggestedReplenishment,
    };
  });

  res.json(predictions);
});

export const predictionController = router;
