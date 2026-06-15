import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

export interface ScentEntry {
  id: string;
  scentType: 'floral' | 'food' | 'nature' | 'urban';
  description: string;
  emotion: 'happy' | 'calm' | 'melancholy' | 'excited' | 'nostalgic';
  imageData?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

let entries: ScentEntry[] = [];

const validateEntry = (body: Partial<ScentEntry>): { valid: boolean; message?: string } => {
  if (!body.scentType) return { valid: false, message: '缺少气味类型' };
  if (!['floral', 'food', 'nature', 'urban'].includes(body.scentType)) {
    return { valid: false, message: '无效的气味类型' };
  }
  if (!body.description) return { valid: false, message: '缺少气味描述' };
  if (!body.emotion) return { valid: false, message: '缺少情绪' };
  if (!['happy', 'calm', 'melancholy', 'excited', 'nostalgic'].includes(body.emotion)) {
    return { valid: false, message: '无效的情绪类型' };
  }
  if (!body.date) return { valid: false, message: '缺少日期' };
  return { valid: true };
};

app.get('/api/entries', (_req: Request, res: Response) => {
  res.json(entries);
});

app.get('/api/entries/:id', (req: Request, res: Response) => {
  const entry = entries.find(e => e.id === req.params.id);
  if (!entry) {
    res.status(404).json({ message: '记录不存在' });
    return;
  }
  res.json(entry);
});

app.post('/api/entries', (req: Request, res: Response) => {
  const validation = validateEntry(req.body);
  if (!validation.valid) {
    res.status(400).json({ message: validation.message });
    return;
  }

  const now = new Date().toISOString();
  const newEntry: ScentEntry = {
    id: uuidv4(),
    scentType: req.body.scentType,
    description: req.body.description,
    emotion: req.body.emotion,
    imageData: req.body.imageData,
    date: req.body.date,
    createdAt: now,
    updatedAt: now,
  };

  entries.push(newEntry);
  res.status(201).json(newEntry);
});

app.put('/api/entries/:id', (req: Request, res: Response) => {
  const index = entries.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ message: '记录不存在' });
    return;
  }

  const validation = validateEntry(req.body);
  if (!validation.valid) {
    res.status(400).json({ message: validation.message });
    return;
  }

  const updatedEntry: ScentEntry = {
    ...entries[index],
    ...req.body,
    id: entries[index].id,
    createdAt: entries[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  entries[index] = updatedEntry;
  res.json(updatedEntry);
});

app.delete('/api/entries/:id', (req: Request, res: Response) => {
  const index = entries.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ message: '记录不存在' });
    return;
  }

  entries.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`气味日记后端服务器运行在 http://localhost:${PORT}`);
});
