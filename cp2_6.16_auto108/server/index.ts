import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Photo, UpdateSmellRequest } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3100;
const DATA_FILE = path.join(__dirname, 'data', 'photos.json');

app.use(cors());
app.use(express.json());

function readPhotos(): Photo[] {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data).photos;
  } catch (err) {
    console.error('Error reading photos data:', err);
    return [];
  }
}

function writePhotos(photos: Photo[]): void {
  try {
    const data = JSON.stringify({ photos }, null, 2);
    fs.writeFileSync(DATA_FILE, data, 'utf-8');
  } catch (err) {
    console.error('Error writing photos data:', err);
  }
}

app.get('/api/photos', (_req, res) => {
  const photos = readPhotos();
  res.json(photos);
});

app.get('/api/photos/search', (req, res) => {
  const q = (req.query.q as string) || '';
  const query = q.trim().toLowerCase();
  
  if (!query) {
    const photos = readPhotos();
    return res.json(photos);
  }

  const photos = readPhotos();
  const filtered = photos.filter((photo) => {
    const description = photo.smellDescription.toLowerCase();
    const tags = photo.smellTags.map((t) => t.toLowerCase());
    const title = photo.title.toLowerCase();
    return (
      description.includes(query) ||
      tags.some((tag) => tag.includes(query)) ||
      title.includes(query)
    );
  });

  res.json(filtered);
});

app.get('/api/photos/:id', (req, res) => {
  const { id } = req.params;
  const photos = readPhotos();
  const photo = photos.find((p) => p.id === id);

  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  res.json(photo);
});

app.put('/api/photos/:id', (req, res) => {
  const { id } = req.params;
  const { smellDescription, smellTags } = req.body as UpdateSmellRequest;

  if (!smellDescription || smellDescription.length > 60) {
    return res.status(400).json({ error: 'Invalid smell description' });
  }

  if (!Array.isArray(smellTags)) {
    return res.status(400).json({ error: 'Invalid smell tags' });
  }

  const photos = readPhotos();
  const index = photos.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  photos[index] = {
    ...photos[index],
    smellDescription,
    smellTags,
  };

  writePhotos(photos);
  res.json(photos[index]);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
