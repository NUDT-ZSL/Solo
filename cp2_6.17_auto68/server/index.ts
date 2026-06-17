import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3050;

app.use(cors());
app.use(express.json());

app.get('/api/orbits', (_req, res) => {
  try {
    const data = readFileSync(join(__dirname, 'data', 'planets.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load planet data' });
  }
});

app.listen(PORT, () => {
  console.log(`Solar System API server running on http://localhost:${PORT}`);
});
