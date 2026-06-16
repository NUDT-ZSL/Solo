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
const DATA_PATH = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

function readData(): any[] {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: any[]): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/items', (_req, res) => {
  setTimeout(() => {
    try {
      const items = readData();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read data' });
    }
  }, 300);
});

app.post('/api/items', (req, res) => {
  setTimeout(() => {
    try {
      const { name, description, image, category } = req.body;
      if (!name || name.trim().length < 2) {
        res.status(400).json({ error: '物品名称至少需要2个字符' });
        return;
      }
      if (!description || description.trim().length < 10) {
        res.status(400).json({ error: '物品描述至少需要10个字符' });
        return;
      }
      const items = readData();
      const newItem = {
        id: uuidv4(),
        name: name.trim(),
        description: description.trim(),
        image: image || '',
        category: category || '其他',
        status: 'available' as const,
        borrower: null as string | null,
        borrowDate: null as string | null
      };
      items.push(newItem);
      writeData(items);
      res.status(201).json(newItem);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add item' });
    }
  }, 200);
});

app.put('/api/items/:id/borrow', (req, res) => {
  setTimeout(() => {
    try {
      const { id } = req.params;
      const { borrower = '志愿者用户' } = req.body;
      const items = readData();
      const idx = items.findIndex((it: any) => it.id === id);
      if (idx === -1) {
        res.status(404).json({ error: '物品不存在' });
        return;
      }
      if (items[idx].status !== 'available') {
        res.status(400).json({ error: '物品当前不可借用' });
        return;
      }
      items[idx] = {
        ...items[idx],
        status: 'borrowed',
        borrower,
        borrowDate: new Date().toISOString().split('T')[0]
      };
      writeData(items);
      res.json(items[idx]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to borrow item' });
    }
  }, 150);
});

app.put('/api/items/:id/return', (req, res) => {
  setTimeout(() => {
    try {
      const { id } = req.params;
      const items = readData();
      const idx = items.findIndex((it: any) => it.id === id);
      if (idx === -1) {
        res.status(404).json({ error: '物品不存在' });
        return;
      }
      if (items[idx].status !== 'borrowed') {
        res.status(400).json({ error: '物品未被借出' });
        return;
      }
      items[idx] = {
        ...items[idx],
        status: 'available',
        borrower: null,
        borrowDate: null
      };
      writeData(items);
      res.json(items[idx]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to return item' });
    }
  }, 150);
});

app.listen(PORT, () => {
  console.log(`[server] Tool library API listening on port ${PORT}`);
});
