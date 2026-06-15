import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const db = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'presets.db'),
  autoload: true,
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});

app.get('/api/presets', async (req, res) => {
  try {
    const presets = await db.find({}).sort({ createdAt: -1 });
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/presets', async (req, res) => {
  try {
    const { name, colors, sizeRange, speedRange, chargeBias } = req.body;
    if (!name || !Array.isArray(colors)) {
      return res.status(400).json({ error: 'Invalid preset data' });
    }
    const preset = {
      _id: uuidv4(),
      name,
      colors,
      sizeRange: sizeRange || [2, 4],
      speedRange: speedRange || [1, 3],
      chargeBias: typeof chargeBias === 'number' ? chargeBias : 0,
      createdAt: Date.now(),
    };
    const doc = await db.insert(preset);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/presets/:id', async (req, res) => {
  try {
    await db.remove({ _id: req.params.id }, {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Particle Garden server running on http://localhost:${PORT}`);
});
