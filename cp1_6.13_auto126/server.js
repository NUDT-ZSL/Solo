import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = Datastore.create({
  filename: path.join(__dirname, 'data', 'soundscapes.db'),
  autoload: true,
});

app.get('/api/soundscapes', async (req, res) => {
  try {
    const docs = await db.find({}).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch soundscapes' });
  }
});

app.post('/api/soundscapes', async (req, res) => {
  try {
    const { name, spheres, globalSettings } = req.body;
    if (!name || !spheres) {
      res.status(400).json({ error: 'Name and spheres are required' });
      return;
    }
    const doc = {
      _id: uuidv4(),
      name,
      spheres,
      globalSettings: globalSettings || {},
      createdAt: new Date().toISOString(),
    };
    await db.insert(doc);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save soundscape' });
  }
});

app.get('/api/soundscapes/:id', async (req, res) => {
  try {
    const doc = await db.findOne({ _id: req.params.id });
    if (!doc) {
      res.status(404).json({ error: 'Soundscape not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch soundscape' });
  }
});

app.delete('/api/soundscapes/:id', async (req, res) => {
  try {
    await db.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete soundscape' });
  }
});

app.listen(PORT, () => {
  console.log(`SoundScapes API server running on http://localhost:${PORT}`);
});
