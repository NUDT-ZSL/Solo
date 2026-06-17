import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '..', 'data', 'stars.json');

function readData() {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: unknown[]) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/stars', (_req, res) => {
  const data = readData();
  res.json(data);
});

app.get('/api/stars/:id', (req, res) => {
  const data = readData();
  const activity = data.find((a: { id: string }) => a.id === req.params.id);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  res.json(activity);
});

app.post('/api/stars', (req, res) => {
  const data = readData();
  const newActivity = {
    id: uuidv4().slice(0, 8),
    ...req.body,
  };
  data.push(newActivity);
  writeData(data);
  res.json({ success: true, data: newActivity });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`StarTrace API server running on http://localhost:${PORT}`);
});
