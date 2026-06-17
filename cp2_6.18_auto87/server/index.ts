import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005;
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'stars.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): any[] {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(content || '[]');
}

function writeData(data: any[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/stars', (_req, res) => {
  try {
    const records = readData();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '读取数据失败' });
  }
});

app.get('/api/stars/:id', (req, res) => {
  try {
    const records = readData();
    const record = records.find((r: any) => r.id === req.params.id);
    if (!record) {
      res.status(404).json({ error: '未找到该记录' });
      return;
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: '读取数据失败' });
  }
});

app.post('/api/stars', (req, res) => {
  try {
    const records = readData();
    const newRecord = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...req.body,
    };
    records.push(newRecord);
    writeData(records);
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: '保存数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`观星记录服务器运行在 http://localhost:${PORT}`);
});
