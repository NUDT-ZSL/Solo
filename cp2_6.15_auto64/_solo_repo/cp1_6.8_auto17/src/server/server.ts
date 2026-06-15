import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'diaries.json');

app.use(express.json());

interface Response {
  id: string;
  content: string;
  createdAt: string;
}

interface Diary {
  id: string;
  content: string;
  tag: string;
  createdAt: string;
  x: number;
  y: number;
  responses: Response[];
  authorId: string;
}

interface StarData {
  diaries: Diary[];
}

function ensureDataDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadData(): StarData {
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  }
  return { diaries: [] };
}

function saveData(data: StarData): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/diaries', (_req, res) => {
  const data = loadData();
  res.json(data.diaries);
});

app.get('/api/diaries/:id', (req, res) => {
  const data = loadData();
  const diary = data.diaries.find((d) => d.id === req.params.id);
  if (!diary) {
    res.status(404).json({ error: 'Diary not found' });
    return;
  }
  res.json(diary);
});

app.get('/api/diaries/author/:authorId', (req, res) => {
  const data = loadData();
  const authorDiaries = data.diaries.filter((d) => d.authorId === req.params.authorId);
  res.json(authorDiaries);
});

app.post('/api/diaries', (req, res) => {
  const data = loadData();
  const { content, tag, authorId, x, y } = req.body;
  if (!content || !tag || !authorId) {
    res.status(400).json({ error: 'content, tag, and authorId are required' });
    return;
  }
  if (content.length > 200) {
    res.status(400).json({ error: 'Content must be 200 characters or less' });
    return;
  }
  const diary: Diary = {
    id: uuidv4(),
    content,
    tag,
    createdAt: new Date().toISOString(),
    x: x ?? Math.random(),
    y: y ?? Math.random(),
    responses: [],
    authorId,
  };
  data.diaries.push(diary);
  saveData(data);
  res.status(201).json(diary);
});

app.post('/api/diaries/:id/respond', (req, res) => {
  const data = loadData();
  const diary = data.diaries.find((d) => d.id === req.params.id);
  if (!diary) {
    res.status(404).json({ error: 'Diary not found' });
    return;
  }
  const { content } = req.body;
  if (!content || content.length > 100) {
    res.status(400).json({ error: 'Response content is required and must be 100 characters or less' });
    return;
  }
  const response: Response = {
    id: uuidv4(),
    content,
    createdAt: new Date().toISOString(),
  };
  diary.responses.push(response);
  saveData(data);
  res.status(201).json(response);
});

app.put('/api/diaries/:id/position', (req, res) => {
  const data = loadData();
  const diary = data.diaries.find((d) => d.id === req.params.id);
  if (!diary) {
    res.status(404).json({ error: 'Diary not found' });
    return;
  }
  const { x, y } = req.body;
  if (typeof x === 'number' && typeof y === 'number') {
    diary.x = x;
    diary.y = y;
    saveData(data);
    res.json(diary);
  } else {
    res.status(400).json({ error: 'x and y must be numbers' });
  }
});

app.delete('/api/diaries/:id', (req, res) => {
  const data = loadData();
  const idx = data.diaries.findIndex((d) => d.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Diary not found' });
    return;
  }
  data.diaries.splice(idx, 1);
  saveData(data);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`🌌 星轨手账服务器运行于 http://localhost:${PORT}`);
});
