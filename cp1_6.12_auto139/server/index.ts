import express, { Request, Response } from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '10mb' }));

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const db = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'worlds.db'),
  autoload: true,
});

interface WorldData {
  _id?: string;
  id: string;
  name: string;
  width: number;
  height: number;
  blocks: Record<string, number>;
  playerStart: { x: number; y: number };
  createdAt: number;
  updatedAt: number;
}

app.get('/world/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const world = await db.findOne({ id }) as WorldData | null;
    
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }
    
    res.json(world);
  } catch (error) {
    console.error('GET /world/:id error:', error);
    res.status(500).json({ error: 'Failed to load world' });
  }
});

app.post('/world', async (req: Request, res: Response) => {
  try {
    const { name, width, height, blocks, playerStart } = req.body;
    
    const world: WorldData = {
      id: uuidv4(),
      name: name || 'Unnamed World',
      width: width || 40,
      height: height || 40,
      blocks: blocks || {},
      playerStart: playerStart || { x: 20, y: 20 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const result = await db.insert(world);
    res.json({ id: result.id, _id: result._id });
  } catch (error) {
    console.error('POST /world error:', error);
    res.status(500).json({ error: 'Failed to save world' });
  }
});

app.put('/world/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, width, height, blocks, playerStart } = req.body;
    
    const existingWorld = await db.findOne({ id }) as WorldData | null;
    if (!existingWorld) {
      return res.status(404).json({ error: 'World not found' });
    }
    
    const updatedWorld: Partial<WorldData> = {
      name: name || existingWorld.name,
      width: width || existingWorld.width,
      height: height || existingWorld.height,
      blocks: blocks || existingWorld.blocks,
      playerStart: playerStart || existingWorld.playerStart,
      updatedAt: Date.now(),
    };
    
    await db.update({ id }, { $set: updatedWorld });
    res.json({ success: true, id });
  } catch (error) {
    console.error('PUT /world/:id error:', error);
    res.status(500).json({ error: 'Failed to update world' });
  }
});

app.delete('/world/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const numRemoved = await db.remove({ id }, {});
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'World not found' });
    }
    
    res.json({ success: true, id });
  } catch (error) {
    console.error('DELETE /world/:id error:', error);
    res.status(500).json({ error: 'Failed to delete world' });
  }
});

app.listen(PORT, () => {
  console.log(`PixelRealm server running on http://localhost:${PORT}`);
});
