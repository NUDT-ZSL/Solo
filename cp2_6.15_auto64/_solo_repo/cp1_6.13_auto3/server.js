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

const dbPath = path.join(dataDir, 'budget.db');
const db = Datastore.create({ filename: dbPath, autoload: true });

app.get('/api/records', async (_req, res) => {
  try {
    const records = await db.find({});
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', async (req, res) => {
  try {
    const { type, category, amount, date } = req.body;
    if (!type || !category || !amount || !date) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    const record = {
      id: uuidv4(),
      type,
      category,
      amount: Number(amount),
      date,
      createdAt: Date.now()
    };
    const inserted = await db.insert(record);
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.remove({ id }, {});
    if (result === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`BudgetBuddy server running on http://localhost:${PORT}`);
});
