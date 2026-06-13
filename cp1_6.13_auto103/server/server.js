import express from 'express';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const dbPath = path.join(__dirname, 'data', 'configs.db');
const db = Datastore.create({
  filename: dbPath,
  autoload: true,
});

app.get('/api/configs', async (req, res) => {
  try {
    const configs = await db.find({}).sort({ createdAt: -1 });
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch configs' });
  }
});

app.post('/api/configs', async (req, res) => {
  try {
    const { name, sources } = req.body;
    const newConfig = {
      _id: uuidv4(),
      name: name || 'Untitled Config',
      createdAt: new Date().toISOString(),
      sources: sources || [],
    };
    const inserted = await db.insert(newConfig);
    res.json(inserted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.get('/api/configs/:id', async (req, res) => {
  try {
    const config = await db.findOne({ _id: req.params.id });
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

app.delete('/api/configs/:id', async (req, res) => {
  try {
    const numRemoved = await db.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Config not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

app.listen(PORT, () => {
  console.log(`SoundScape server running on http://localhost:${PORT}`);
});
