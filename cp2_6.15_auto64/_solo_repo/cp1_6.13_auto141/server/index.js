import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const db = Datastore.create(join(__dirname, 'presets.db'));

app.get('/api/presets', async (req, res) => {
  try {
    const presets = await db.find({});
    res.json(presets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

app.post('/api/presets', async (req, res) => {
  try {
    const { name, sigma, rho, beta, waveType, volume, notes } = req.body;
    const preset = {
      _id: uuidv4(),
      name,
      sigma,
      rho,
      beta,
      waveType,
      volume,
      notes,
      createdAt: new Date().toISOString()
    };
    const result = await db.insert(preset);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save preset' });
  }
});

app.get('/api/presets/:id', async (req, res) => {
  try {
    const preset = await db.findOne({ _id: req.params.id });
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    res.json(preset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preset' });
  }
});

app.delete('/api/presets/:id', async (req, res) => {
  try {
    const numRemoved = await db.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
