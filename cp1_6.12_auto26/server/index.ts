import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  initDatabase,
  getAllTransactions,
  createTransaction,
  deleteTransaction,
  getAllBudgets,
  getBudgetsByMonth,
  createBudget,
  deleteBudget,
  getSummary,
  getCategorySpentByMonth
} from './database';

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});

initDatabase();

app.get('/api/transactions', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, category, tag, page, pageSize } = req.query;
    const result = getAllTransactions({
      startDate: startDate as string,
      endDate: endDate as string,
      category: category as string,
      tag: tag as string,
      page: page ? parseInt(page as string, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', (req: Request, res: Response) => {
  try {
    const { type, amount, category, description, tags, date } = req.body;
    if (!type || !amount || !category || !date) {
      res.status(400).json({ error: '缺少必要字段: type, amount, category, date' });
      return;
    }
    const tx = createTransaction({
      id: uuidv4(),
      type,
      amount: parseFloat(amount),
      category,
      description: description || '',
      tags: JSON.stringify(tags || []),
      date
    });
    res.json(tx);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', (req: Request, res: Response) => {
  try {
    const success = deleteTransaction(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '记录不存在' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/budgets', (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    if (month) {
      const budgets = getBudgetsByMonth(month as string);
      const spent = getCategorySpentByMonth(month as string);
      const spentMap = new Map(spent.map(s => [s.category, s.spent]));
      const withSpent = budgets.map(b => ({
        ...b,
        spent: +(spentMap.get(b.category) || 0).toFixed(2)
      }));
      res.json(withSpent);
    } else {
      res.json(getAllBudgets());
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/budgets', (req: Request, res: Response) => {
  try {
    const { month, category, amount } = req.body;
    if (!month || !category || !amount) {
      res.status(400).json({ error: '缺少必要字段: month, category, amount' });
      return;
    }
    const budget = createBudget({
      id: uuidv4(),
      month,
      category,
      amount: parseFloat(amount)
    });
    res.json(budget);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/budgets/:id', (req: Request, res: Response) => {
  try {
    const success = deleteBudget(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '预算不存在' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/summary', (req: Request, res: Response) => {
  try {
    const { months } = req.query;
    const summary = getSummary(months ? parseInt(months as string, 10) : 6);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Finance API server running on http://localhost:${PORT}`);
});
