import express from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '10mb' }));

const dbPath = join(__dirname, '..', 'data', 'snapshots.db');
const snapshotsDb = Datastore.create(dbPath);

snapshotsDb.load().then(() => {
  console.log('Snapshots database loaded');
}).catch((err: Error) => {
  console.error('Database load error:', err);
});

app.get('/api/snapshots', async (req, res) => {
  try {
    const snapshots = await snapshotsDb.find({}).sort({ timestamp: -1 });
    res.json(snapshots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

app.get('/api/snapshots/:id', async (req, res) => {
  try {
    const snapshot = await snapshotsDb.findOne({ _id: req.params.id });
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
});

app.post('/api/snapshots', async (req, res) => {
  try {
    const { height, leafCount, lightIntensity, nutrientConcentration, gravityMode, thumbnail, stage } = req.body;
    
    const snapshot = {
      _id: uuidv4(),
      height,
      leafCount,
      lightIntensity,
      nutrientConcentration,
      gravityMode,
      thumbnail,
      stage,
      timestamp: Date.now()
    };
    
    const newSnapshot = await snapshotsDb.insert(snapshot);
    res.status(201).json(newSnapshot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

app.put('/api/snapshots/:id', async (req, res) => {
  try {
    const updated = await snapshotsDb.update(
      { _id: req.params.id },
      { $set: req.body },
      { returnUpdatedDocs: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update snapshot' });
  }
});

app.delete('/api/snapshots/:id', async (req, res) => {
  try {
    const numRemoved = await snapshotsDb.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json({ message: 'Snapshot deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
