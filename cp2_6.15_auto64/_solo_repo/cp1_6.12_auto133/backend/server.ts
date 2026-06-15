import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const db = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'snippets.db'),
  autoload: true,
});

db.ensureIndex({ fieldName: 'shareCode', unique: true }).catch(() => {});

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.post('/post-save', async (req, res) => {
  try {
    const { code, language, graphData } = req.body;
    if (!code || !language) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    let shareCode = generateShareCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.findOne({ shareCode });
      if (!existing) break;
      shareCode = generateShareCode();
      attempts++;
    }

    await db.insert({
      shareCode,
      code,
      language,
      graphData: graphData || { nodes: [], edges: [] },
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, code: shareCode });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ success: false, error: 'Failed to save snippet' });
  }
});

app.get('/get-snippet/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const doc = await db.findOne({ shareCode: code });
    if (!doc) {
      res.status(404).json({ success: false, data: null });
      return;
    }
    res.json({
      success: true,
      data: {
        code: doc.code,
        language: doc.language,
        graphData: doc.graphData,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ success: false, data: null });
  }
});

app.listen(PORT, () => {
  console.log(`CodeCanvas backend running on http://localhost:${PORT}`);
});
