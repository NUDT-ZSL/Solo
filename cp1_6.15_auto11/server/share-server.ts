import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const store = new Map<string, string>();

app.post('/save', (req, res) => {
  try {
    const { markdown } = req.body;

    if (!markdown || typeof markdown !== 'string') {
      return res.status(400).json({ error: 'Invalid markdown content' });
    }

    const id = uuidv4();
    store.set(id, markdown);

    res.json({ id, success: true });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.get('/load/:id', (req, res) => {
  try {
    const { id } = req.params;
    const markdown = store.get(id);

    if (!markdown) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ markdown, success: true });
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Failed to load' });
  }
});

app.get('/', (_req, res) => {
  res.json({ message: 'Markdown Slides Share Server' });
});

app.listen(PORT, () => {
  console.log(`Share server running on http://localhost:${PORT}`);
});
