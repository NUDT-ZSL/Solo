import express from 'express';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const db = Datastore.create(path.join(__dirname, 'wind-configs.db'));

app.get('/api/configs', async (req, res) => {
  try {
    const configs = await db.find({}).sort({ createdAt: -1 }).limit(10);
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch configs' });
  }
});

app.post('/api/configs', async (req, res) => {
  try {
    const { name, nodes, aircraftStart } = req.body;
    
    const allConfigs = await db.find({}).sort({ createdAt: -1 });
    if (allConfigs.length >= 10) {
      const oldest = allConfigs[allConfigs.length - 1];
      await db.remove({ _id: oldest._id });
    }

    const config = {
      name: name || `Config_${Date.now()}`,
      nodes: nodes || [],
      aircraftStart: aircraftStart || { x: 400, y: 300, angle: 0 },
      createdAt: Date.now(),
    };

    const result = await db.insert(config);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.get('/api/configs/:id', async (req, res) => {
  try {
    const config = await db.findOne({ _id: req.params.id });
    if (!config) {
      res.status(404).json({ error: 'Config not found' });
    } else {
      res.json(config);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

app.delete('/api/configs/:id', async (req, res) => {
  try {
    const numRemoved = await db.remove({ _id: req.params.id });
    if (numRemoved === 0) {
      res.status(404).json({ error: 'Config not found' });
    } else {
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

app.listen(PORT, () => {
  console.log(`WindSim server running on port ${PORT}`);
});
