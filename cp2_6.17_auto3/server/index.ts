import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3003;
const DATA_FILE = path.join(__dirname, '..', 'data', 'bottles.json');

interface BottleWrite {
  content: string;
  author: string;
  createdAt: string;
}

interface Bottle {
  id: string;
  title: string;
  content: string;
  color: string;
  author: string;
  mileage: number;
  likes: number;
  writes: BottleWrite[];
  createdAt: string;
  updatedAt: string;
}

function readData(): Bottle[] {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeData(data: Bottle[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.use(cors());
app.use(express.json());

app.get('/bottles', (_req, res) => {
  const data = readData();
  res.json(data);
});

app.post('/bottles', (req, res) => {
  const { title, content, color, author } = req.body;
  if (!title || !content || !color) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const data = readData();
  const now = new Date().toISOString();
  const newBottle: Bottle = {
    id: uuidv4(),
    title: String(title).slice(0, 20),
    content: String(content).slice(0, 500),
    color: String(color),
    author: String(author || '匿名旅人').slice(0, 20),
    mileage: 0,
    likes: 0,
    writes: [],
    createdAt: now,
    updatedAt: now,
  };
  data.push(newBottle);
  writeData(data);
  res.status(201).json(newBottle);
});

app.post('/bottles/:id/pick', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const idx = data.findIndex((b) => b.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  data[idx].mileage += 1;
  data[idx].updatedAt = new Date().toISOString();
  writeData(data);
  res.json(data[idx]);
});

app.post('/bottles/:id/write', (req, res) => {
  const { id } = req.params;
  const { content, author } = req.body;
  if (!content) {
    res.status(400).json({ error: 'Content is required' });
    return;
  }
  const data = readData();
  const idx = data.findIndex((b) => b.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  const write: BottleWrite = {
    content: String(content).slice(0, 200),
    author: String(author || '匿名旅人').slice(0, 20),
    createdAt: new Date().toISOString(),
  };
  data[idx].writes.push(write);
  data[idx].updatedAt = new Date().toISOString();
  writeData(data);
  res.json(data[idx]);
});

app.post('/bottles/:id/like', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const idx = data.findIndex((b) => b.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  data[idx].likes += 1;
  data[idx].updatedAt = new Date().toISOString();
  writeData(data);
  res.json(data[idx]);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
