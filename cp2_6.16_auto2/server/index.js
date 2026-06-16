import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'photos.json');

app.use(cors());
app.use(express.json());

const readPhotosData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading photos data:', err);
    return [];
  }
};

app.get('/api/photos', (_req, res) => {
  try {
    const photos = readPhotosData();
    photos.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(photos);
  } catch (err) {
    console.error('Error in GET /api/photos:', err);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

app.get('/api/photos/:date', (req, res) => {
  try {
    const { date } = req.params;
    const photos = readPhotosData();
    const photo = photos.find((p) => p.date === date);

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found for this date' });
    }

    res.json(photo);
  } catch (err) {
    console.error('Error in GET /api/photos/:date:', err);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

app.listen(PORT, () => {
  console.log(`Plant Growth Diary Server running on http://localhost:${PORT}`);
  console.log(`GET /api/photos - List all photos`);
  console.log(`GET /api/photos/:date - Get photo by date (e.g. 2026-06-16)`);
});
