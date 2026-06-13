import express, { Request, Response } from 'express';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'layouts.db'),
  autoload: true,
});

app.post('/api/save', async (req: Request, res: Response) => {
  try {
    const { name, buildings, sunAltitude, sunAzimuth, createdAt } = req.body;

    if (!buildings || !Array.isArray(buildings)) {
      return res.status(400).json({ error: 'Invalid buildings data' });
    }

    const layout = {
      name: name || `布局_${Date.now()}`,
      buildings,
      sunAltitude: sunAltitude || 45,
      sunAzimuth: sunAzimuth || 180,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = await db.findOne({ name: layout.name });
    if (existing) {
      const updated = await db.update(
        { _id: existing._id },
        { $set: { ...layout, updatedAt: new Date().toISOString() } },
        { returnUpdatedDocs: true }
      );
      return res.json({ success: true, data: updated });
    } else {
      const inserted = await db.insert(layout);
      return res.json({ success: true, data: inserted });
    }
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

app.get('/api/load', async (req: Request, res: Response) => {
  try {
    const { name, id } = req.query;

    let query: Record<string, unknown> = {};
    if (id) {
      query._id = id as string;
    } else if (name) {
      query.name = name as string;
    }

    const layouts = await db.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, data: layouts });
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Failed to load layouts' });
  }
});

app.get('/api/layouts', async (_req: Request, res: Response) => {
  try {
    const layouts = await db.find({}).sort({ updatedAt: -1 });
    const summary = layouts.map(l => ({
      _id: l._id,
      name: l.name,
      buildingCount: (l.buildings as unknown[]).length,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('List layouts error:', error);
    res.status(500).json({ error: 'Failed to list layouts' });
  }
});

app.delete('/api/layouts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const numRemoved = await db.remove({ _id: id }, {});
    if (numRemoved > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Layout not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete layout' });
  }
});

app.listen(PORT, () => {
  console.log(`[Sunlight Analyzer Server] running on http://localhost:${PORT}`);
});
