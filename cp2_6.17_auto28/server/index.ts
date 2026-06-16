import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '..', 'data');

const app = express();
app.use(cors());
app.use(express.json());

function readJSON(filename: string) {
  const fp = path.join(dataDir, filename);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

function writeJSON(filename: string, data: any) {
  const fp = path.join(dataDir, filename);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

function heightToColor(height: number): string {
  const t = (height - 3) / 9;
  const r1 = 0xf9, g1 = 0x73, b1 = 0x16;
  const r2 = 0x3b, g2 = 0x82, b2 = 0xf6;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

app.get('/api/buildings', (_req, res) => {
  const buildings = readJSON('buildings.json');
  const enriched = buildings.map((b: any) => ({
    ...b,
    color: heightToColor(b.height),
  }));
  res.json(enriched);
});

app.post('/api/sessions', (req, res) => {
  const sessions = readJSON('sessions.json');
  const newSession = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString(),
  };
  sessions.push(newSession);
  writeJSON('sessions.json', sessions);
  res.json(newSession);
});

app.get('/api/sessions', (_req, res) => {
  const sessions = readJSON('sessions.json');
  res.json(sessions);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
