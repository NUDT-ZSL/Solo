const express = require('express');
const Datastore = require('nedb-promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const dbDir = path.join(__dirname, 'data');
const plantsDB = Datastore.create(path.join(dbDir, 'plants.db'));
const logsDB = Datastore.create(path.join(dbDir, 'logs.db'));

plantsDB.load().then(() => console.log('Plants DB loaded'));
logsDB.load().then(() => console.log('Logs DB loaded'));

app.get('/api/plants', async (req, res) => {
  try {
    const plants = await plantsDB.find({}).sort({ createdAt: -1 });
    res.json(plants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/plants/:id', async (req, res) => {
  try {
    const plant = await plantsDB.findOne({ _id: req.params.id });
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    res.json(plant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plants', async (req, res) => {
  try {
    const { name, species, photoUrl, waterCycle, fertilizeCycle } = req.body;
    if (!name || !waterCycle || !fertilizeCycle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const plant = {
      _id: uuidv4(),
      name,
      species: species || '',
      photoUrl: photoUrl || '',
      waterCycle: parseInt(waterCycle),
      fertilizeCycle: parseInt(fertilizeCycle),
      lastWatered: null,
      lastFertilized: null,
      createdAt: new Date().toISOString(),
    };
    await plantsDB.insert(plant);
    res.status(201).json(plant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/plants/:id', async (req, res) => {
  try {
    const plant = await plantsDB.findOne({ _id: req.params.id });
    if (!plant) return res.status(404).json({ error: 'Plant not found' });
    const updated = { ...plant, ...req.body };
    await plantsDB.update({ _id: req.params.id }, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/plants/:id', async (req, res) => {
  try {
    const numRemoved = await plantsDB.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) return res.status(404).json({ error: 'Plant not found' });
    await logsDB.remove({ plantId: req.params.id }, { multi: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/plants/:id/logs', async (req, res) => {
  try {
    const logs = await logsDB.find({ plantId: req.params.id }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plants/:id/logs', async (req, res) => {
  try {
    const { type } = req.body;
    if (type !== 'water' && type !== 'fertilize') {
      return res.status(400).json({ error: 'Invalid log type' });
    }
    const plant = await plantsDB.findOne({ _id: req.params.id });
    if (!plant) return res.status(404).json({ error: 'Plant not found' });

    const timestamp = new Date().toISOString();
    const log = {
      _id: uuidv4(),
      plantId: req.params.id,
      type,
      timestamp,
    };
    await logsDB.insert(log);

    if (type === 'water') {
      await plantsDB.update({ _id: req.params.id }, { $set: { lastWatered: timestamp } });
    } else {
      await plantsDB.update({ _id: req.params.id }, { $set: { lastFertilized: timestamp } });
    }

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await logsDB.find({}).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PlantMind server running on http://localhost:${PORT}`);
});
