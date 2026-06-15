import express, { Request, Response } from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const dbPath = path.join(__dirname, '..', 'data', 'budget.db');
const db = Datastore.create({ filename: dbPath, autoload: true });

interface Record {
  _id?: string;
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  createdAt?: number;
}

app.get('/api/records', async (_req: Request, res: Response) => {
  try {
    const records: Record[] = await db.find({});
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', async (req: Request, res: Response) => {
  try {
    const { type, category, amount, date } = req.body;
    if (!type || !category || !amount || !date) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    const record: Record = {
      id: uuidv4(),
      type,
      category,
      amount: Number(amount),
      date,
      createdAt: Date.now()
    };
    const inserted = await db.insert(record);
    res.status(201).json(inserted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.remove({ id }, {});
    if (result === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`BudgetBuddy server running on http://localhost:${PORT}`);
});
