import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

export interface ScentEntry {
  id: string;
  date: string;
  scentType: 'flower' | 'food' | 'nature' | 'city';
  description: string;
  emotion: 'happy' | 'calm' | 'nostalgic' | 'melancholy' | 'excited';
  imageData?: string;
  createdAt: number;
  updatedAt: number;
}

let entries: ScentEntry[] = [];

const validateEntry = (entry: Partial<ScentEntry>): entry is ScentEntry => {
  return !!(
    entry.date &&
    entry.scentType &&
    entry.description !== undefined &&
    entry.emotion &&
    ['flower', 'food', 'nature', 'city'].includes(entry.scentType) &&
    ['happy', 'calm', 'nostalgic', 'melancholy', 'excited'].includes(entry.emotion)
  );
};

app.get('/api/entries', (_req, res) => {
  res.json(entries.sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/entries', (req, res) => {
  const { date, scentType, description, emotion, imageData } = req.body;

  const newEntry: ScentEntry = {
    id: uuidv4(),
    date,
    scentType,
    description,
    emotion,
    imageData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (!validateEntry(newEntry)) {
    return res.status(400).json({ error: '缺少必填字段或字段格式错误' });
  }

  entries.push(newEntry);
  res.status(201).json(newEntry);
});

app.put('/api/entries/:id', (req, res) => {
  const { id } = req.params;
  const index = entries.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '记录不存在' });
  }

  const updatedEntry: ScentEntry = {
    ...entries[index],
    ...req.body,
    id,
    updatedAt: Date.now(),
  };

  if (!validateEntry(updatedEntry)) {
    return res.status(400).json({ error: '字段格式错误' });
  }

  entries[index] = updatedEntry;
  res.json(updatedEntry);
});

app.delete('/api/entries/:id', (req, res) => {
  const { id } = req.params;
  const index = entries.findIndex((e) => e.id === id);

  if (index === -1) {
    return res.status(404).json({ error: '记录不存在' });
  }

  entries.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`气味日记后端服务器运行在 http://localhost:${PORT}`);
});
