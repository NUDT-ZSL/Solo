import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

let batches = [];
let roasts = [];
let tastings = [];
let labels = [];

app.post('/api/batch', (req, res) => {
  const batch = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  batches.push(batch);
  res.status(201).json(batch);
});

app.get('/api/batches', (_req, res) => {
  res.json(batches);
});

app.post('/api/roast', (req, res) => {
  const roast = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  roasts.push(roast);
  res.status(201).json(roast);
});

app.put('/api/roast/:id', (req, res) => {
  const idx = roasts.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  roasts[idx] = { ...roasts[idx], ...req.body };
  res.json(roasts[idx]);
});

app.post('/api/tasting', (req, res) => {
  const tasting = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  tastings.push(tasting);
  res.status(201).json(tasting);
});

app.get('/api/labels', (_req, res) => {
  res.json(labels);
});

app.post('/api/label', (req, res) => {
  const label = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  labels.push(label);
  res.status(201).json(label);
});

app.listen(3001, () => {
  console.log('RoastTracker server running on port 3001');
});
