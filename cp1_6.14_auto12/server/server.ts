import express from 'express';
import cors from 'cors';
import { configsDb, presetsDb } from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const POSES = [
  'idle', 'idle2', 'idle3',
  'run', 'run_left', 'run_right',
  'jump', 'jump_up', 'jump_down', 'double_jump',
  'attack', 'attack2', 'attack3', 'attack_slash', 'attack_thrust',
  'hurt', 'hurt2',
  'die', 'die2',
  'walk', 'walk_left', 'walk_right',
  'crouch', 'crouch_walk',
  'dash', 'roll',
  'block', 'parry',
  'cast', 'heal',
];

async function ensurePresets() {
  const count = await presetsDb.count({});
  if (count === 0) {
    const docs = POSES.map((pose, i) => ({
      name: pose,
      index: i,
      width: 256,
      height: 256,
      frames: 4,
    }));
    await presetsDb.insert(docs);
  }
}

app.get('/api/presets', async (_req, res) => {
  try {
    const presets = await presetsDb.find({}).sort({ index: 1 });
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load presets' });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const doc = await configsDb.insert(req.body);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.get('/api/config/:id', async (req, res) => {
  try {
    const doc = await configsDb.findOne({ _id: req.params.id });
    if (!doc) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load config' });
  }
});

app.delete('/api/config/:id', async (req, res) => {
  try {
    await configsDb.remove({ _id: req.params.id }, {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

app.get('/api/configs', async (_req, res) => {
  try {
    const docs = await configsDb.find({});
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list configs' });
  }
});

ensurePresets().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
