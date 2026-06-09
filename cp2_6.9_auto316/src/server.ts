import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Item {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: number;
  expiresAt: number;
}

const app = express();
const PORT = 3001;
const TTL_MS = 24 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json());

let items: Map<string, Item> = new Map();

const cleanupExpiredItems = () => {
  const now = Date.now();
  for (const [id, item] of items) {
    if (item.expiresAt <= now) {
      items.delete(id);
    }
  }
};

setInterval(cleanupExpiredItems, 10 * 1000);

app.get('/api/items', (_req, res) => {
  cleanupExpiredItems();
  const activeItems = Array.from(items.values()).filter(
    (item) => item.expiresAt > Date.now()
  );
  res.json(activeItems);
});

app.post('/api/items', (req, res) => {
  const { title, description, imageUrl } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: '标题和描述是必填项' });
  }

  if (title.length > 20) {
    return res.status(400).json({ error: '标题不能超过20个字符' });
  }

  if (description.length > 50) {
    return res.status(400).json({ error: '描述不能超过50个字符' });
  }

  const now = Date.now();
  const item: Item = {
    id: uuidv4(),
    title: String(title).trim(),
    description: String(description).trim(),
    imageUrl: imageUrl ? String(imageUrl).trim() : undefined,
    createdAt: now,
    expiresAt: now + TTL_MS,
  };

  items.set(item.id, item);
  res.status(201).json(item);
});

app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  if (items.has(id)) {
    items.delete(id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: '商品不存在' });
  }
});

app.listen(PORT, () => {
  console.log(`瞬态商店后端服务运行在 http://localhost:${PORT}`);
});
