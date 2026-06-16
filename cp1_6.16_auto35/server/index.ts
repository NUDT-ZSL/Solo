import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const templates = [
  {
    id: 'spiral',
    name: '螺旋星云',
    type: 'spiral',
    particleCount: 5000,
    colorPreset: 'bluePurple',
    rotationSpeed: 0.8,
    radius: 50,
    spiralArms: 3,
    armWidth: 0.4,
    concentration: 0.6,
  },
  {
    id: 'elliptical',
    name: '椭圆星云',
    type: 'elliptical',
    particleCount: 5000,
    colorPreset: 'redOrange',
    rotationSpeed: 0.3,
    radius: 50,
    eccentricity: 0.6,
    flatness: 0.3,
    concentration: 0.8,
  },
  {
    id: 'irregular',
    name: '不规则星云',
    type: 'irregular',
    particleCount: 5000,
    colorPreset: 'warm',
    rotationSpeed: 0.1,
    radius: 50,
    clusterCount: 5,
    clusterSpread: 15,
    concentration: 0.4,
  },
];

const savedNebulae: any[] = [];

app.get('/api/templates', (_req, res) => {
  res.json(templates);
});

app.post('/api/nebula', (req, res) => {
  const config = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  savedNebulae.push(config);
  res.status(201).json(config);
});

app.get('/api/nebula', (_req, res) => {
  res.json(savedNebulae);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Nebula server running on http://localhost:${PORT}`);
});
