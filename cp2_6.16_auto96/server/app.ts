import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.resolve(__dirname, '../data');

app.get('/api/albums', async (req, res) => {
  try {
    const albumsPath = path.resolve(dataDir, 'albums.json');
    const data = await fs.readFile(albumsPath, 'utf-8');
    const albums = JSON.parse(data);
    res.json(albums);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

app.get('/api/album/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const albumsPath = path.resolve(dataDir, 'albums.json');
    const data = await fs.readFile(albumsPath, 'utf-8');
    const albums = JSON.parse(data);
    const album = albums.find((a: { id: string; audioFile: string }) => a.id === id);

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    let audioBase64 = '';
    try {
      const audioPath = path.resolve(dataDir, 'audio', album.audioFile);
      const audioBuffer = await fs.readFile(audioPath);
      audioBase64 = audioBuffer.toString('base64');
    } catch {
      audioBase64 = '';
    }

    res.json({ ...album, audioBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

app.post('/api/listen', async (req, res) => {
  try {
    const { albumId, trackTitle, duration } = req.body;

    if (!albumId || !trackTitle || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const listensPath = path.resolve(dataDir, 'listens.json');
    let listens: Array<{
      id: string;
      albumId: string;
      trackTitle: string;
      duration: number;
      timestamp: number;
    }> = [];

    try {
      const data = await fs.readFile(listensPath, 'utf-8');
      listens = JSON.parse(data);
    } catch {
      listens = [];
    }

    const newListen = {
      id: uuidv4(),
      albumId,
      trackTitle,
      duration,
      timestamp: Date.now(),
    };

    listens.push(newListen);
    await fs.writeFile(listensPath, JSON.stringify(listens, null, 2));
    res.json(newListen);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save listen record' });
  }
});

app.get('/api/listens', async (req, res) => {
  try {
    const listensPath = path.resolve(dataDir, 'listens.json');
    let listens = [];
    try {
      const data = await fs.readFile(listensPath, 'utf-8');
      listens = JSON.parse(data);
    } catch {
      listens = [];
    }
    res.json(listens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listens' });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port 3001');
});
