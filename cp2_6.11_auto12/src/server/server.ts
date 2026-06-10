import express from 'express';
import cors from 'cors';
import { BottleManager } from './bottleManager';
import type { CreateBottleDto } from '../shared/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const bottleManager = new BottleManager();

setInterval(() => {
  bottleManager.updatePositions();
}, 5000);

app.get('/api/bottles', (req, res) => {
  const bottles = bottleManager.getAllBottles();
  res.json(bottles);
});

app.get('/api/bottles/:id', (req, res) => {
  const bottle = bottleManager.getBottle(req.params.id);
  if (!bottle) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  res.json(bottle);
});

app.post('/api/bottles', (req, res) => {
  try {
    const dto = req.body as CreateBottleDto;
    if (!dto || typeof dto.lat !== 'number' || typeof dto.lng !== 'number' || !dto.audioData) {
      res.status(400).json({ error: 'Invalid bottle data' });
      return;
    }
    const bottle = bottleManager.createBottle(dto);
    res.status(201).json(bottle);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create bottle' });
  }
});

app.post('/api/bottles/:id/collect', (req, res) => {
  const bottle = bottleManager.collectBottle(req.params.id);
  if (!bottle) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  res.json(bottle);
});

app.post('/api/bottles/:id/release', (req, res) => {
  const bottle = bottleManager.releaseBottle(req.params.id);
  if (!bottle) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  res.json(bottle);
});

app.post('/api/bottles/:id/touch', (req, res) => {
  bottleManager.touchBottle(req.params.id);
  res.json({ ok: true });
});

app.get('/api/field', (req, res) => {
  const vectors = bottleManager.computeFieldVectors();
  const { cols, rows } = bottleManager.getGridSize();
  res.json({ vectors, cols, rows });
});

app.post('/api/canvas-size', (req, res) => {
  const { width, height } = req.body;
  if (typeof width === 'number' && typeof height === 'number') {
    bottleManager.setCanvasSize(width, height);
  }
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Echo Drift Bottle server running on http://localhost:${PORT}`);
});
