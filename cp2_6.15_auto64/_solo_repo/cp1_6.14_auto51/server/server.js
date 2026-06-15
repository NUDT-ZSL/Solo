import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const defaultData = {
  graphs: [],
  shares: [],
};

const file = join(dataDir, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter, defaultData);

await db.read();
await db.write();

app.post('/api/graphs', async (req, res) => {
  try {
    const { name, tags, expressions, parameters, mode, thumbnail, viewState } = req.body;
    const id = uuidv4();
    const graph = {
      id,
      name: name || `图形 ${db.data.graphs.length + 1}`,
      tags: tags || [],
      expressions: expressions || [],
      parameters: parameters || {},
      mode: mode || '2d',
      thumbnail: thumbnail || '',
      viewState: viewState || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    db.data.graphs.push(graph);
    await db.write();
    res.json({ success: true, id, graph });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/graphs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const graph = db.data.graphs.find((g) => g.id === id);
    if (!graph) {
      return res.status(404).json({ success: false, error: 'Graph not found' });
    }
    res.json({ success: true, graph });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/graphs', async (_req, res) => {
  try {
    const graphs = [...db.data.graphs].sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, graphs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.post('/api/share', async (req, res) => {
  try {
    const graphId = req.body.graphId;
    const graph = db.data.graphs.find((g) => g.id === graphId);
    if (!graph) {
      return res.status(404).json({ success: false, error: 'Graph not found' });
    }
    let code = generateShortCode();
    while (db.data.shares.find((s) => s.code === code)) {
      code = generateShortCode();
    }
    const share = {
      code,
      graphId,
      createdAt: Date.now(),
    };
    db.data.shares.push(share);
    await db.write();
    res.json({ success: true, code, shortUrl: `http://localhost:5173/s/${code}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/share/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const share = db.data.shares.find((s) => s.code === code);
    if (!share) {
      return res.status(404).json({ success: false, error: 'Share code not found' });
    }
    const graph = db.data.graphs.find((g) => g.id === share.graphId);
    if (!graph) {
      return res.status(404).json({ success: false, error: 'Graph not found' });
    }
    res.json({ success: true, graph });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/graphs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idx = db.data.graphs.findIndex((g) => g.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Graph not found' });
    }
    db.data.graphs.splice(idx, 1);
    await db.write();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Math Visualizer server running on http://localhost:${PORT}`);
});
