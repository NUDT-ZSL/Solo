import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/presets', async (_req, res) => {
  const filePath = path.resolve(__dirname, './data/presets.json');
  const data = await fs.readFile(filePath, 'utf-8');
  res.status(200).json(JSON.parse(data));
});

app.get('/api/gallery', async (_req, res) => {
  const filePath = path.resolve(__dirname, './data/gallery.json');
  const data = await fs.readFile(filePath, 'utf-8');
  res.status(200).json(JSON.parse(data));
});

app.post('/api/save', async (req, res) => {
  const { thumbnail, emotion, emotionLabel, speed, hueOffset, complexity } = req.body;
  const filePath = path.resolve(__dirname, './data/gallery.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const gallery = JSON.parse(raw);

  const newItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    thumbnail,
    emotion,
    emotionLabel,
    speed,
    hueOffset,
    complexity,
  };

  gallery.push(newItem);
  await fs.writeFile(filePath, JSON.stringify(gallery, null, 2), 'utf-8');

  res.status(200).json(newItem);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
