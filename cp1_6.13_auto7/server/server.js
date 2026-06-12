import express from 'express';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'data', 'planets.db');
const db = Datastore.create({ filename: dbPath, autoload: true });

app.get('/api/planets', async (req, res) => {
  try {
    const planets = await db.find({});
    const summary = planets.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      mass: p.mass,
      radius: p.radius,
      color: p.color,
      orbitRadius: p.orbitRadius,
      orbitSpeed: p.orbitSpeed,
      hasRings: p.hasRings || false,
    }));
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch planets' });
  }
});

app.get('/api/planets/:id', async (req, res) => {
  try {
    const planet = await db.findOne({ id: req.params.id });
    if (!planet) {
      return res.status(404).json({ error: 'Planet not found' });
    }
    res.json(planet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch planet details' });
  }
});

app.listen(PORT, () => {
  console.log(`OrbitView server running on http://localhost:${PORT}`);
});

export default app;
