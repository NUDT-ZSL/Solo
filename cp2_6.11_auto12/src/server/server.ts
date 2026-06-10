import express from 'express';
import cors from 'cors';
import { BottleManager } from './bottleManager';
import type { CreateBottleDto } from '../shared/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const bottleManager = new BottleManager();

const GRID_COLS = 5;
const GRID_ROWS = 2;

function generateBaseFieldVectors(): { x: number; y: number }[][] {
  const vectors: { x: number; y: number }[][] = [];
  const directions = [
    { x: 1, y: 0 },
    { x: 0.707, y: 0.707 },
    { x: 0, y: 1 },
    { x: -0.707, y: 0.707 },
    { x: -1, y: 0 },
    { x: -0.707, y: -0.707 },
    { x: 0, y: -1 },
    { x: 0.707, y: -0.707 },
    { x: 0.5, y: 0.5 },
    { x: -0.5, y: -0.5 }
  ];

  for (let r = 0; r < GRID_ROWS; r++) {
    const row: { x: number; y: number }[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const idx = Math.floor(Math.random() * directions.length);
      const dir = directions[idx];
      const scale = 0.5 + Math.random() * 0.5;
      row.push({ x: dir.x * scale, y: dir.y * scale });
    }
    vectors.push(row);
  }
  return vectors;
}

let currentFieldVectors = generateBaseFieldVectors();

function bilinearInterpolate(
  px: number, py: number,
  vectors: { x: number; y: number }[][],
  cols: number, rows: number,
  width: number, height: number
): { x: number; y: number } {
  const gx = (px / width) * (cols - 1);
  const gy = (py / height) * (rows - 1);

  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(cols - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);

  const fx = gx - x0;
  const fy = gy - y0;

  const v00 = vectors[y0][x0];
  const v10 = vectors[y0][x1];
  const v01 = vectors[y1][x0];
  const v11 = vectors[y1][x1];

  const topX = v00.x * (1 - fx) + v10.x * fx;
  const topY = v00.y * (1 - fx) + v10.y * fx;
  const botX = v01.x * (1 - fx) + v11.x * fx;
  const botY = v01.y * (1 - fx) + v11.y * fx;

  return {
    x: topX * (1 - fy) + botX * fy,
    y: topY * (1 - fy) + botY * fy
  };
}

setInterval(() => {
  bottleManager.updatePositions(currentFieldVectors, GRID_COLS, GRID_ROWS);
}, 5000);

setInterval(() => {
  currentFieldVectors = generateBaseFieldVectors();
}, 15000);

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
  res.json({
    vectors: currentFieldVectors,
    cols: GRID_COLS,
    rows: GRID_ROWS
  });
});

app.get('/api/field/at', (req, res) => {
  const x = parseFloat(req.query.x as string);
  const y = parseFloat(req.query.y as string);
  const w = parseFloat(req.query.w as string) || 1200;
  const h = parseFloat(req.query.h as string) || 800;
  if (isNaN(x) || isNaN(y)) {
    res.status(400).json({ error: 'Invalid coordinates' });
    return;
  }
  const vec = bilinearInterpolate(x, y, currentFieldVectors, GRID_COLS, GRID_ROWS, w, h);
  res.json(vec);
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
