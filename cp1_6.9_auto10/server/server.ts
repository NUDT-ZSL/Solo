import express from 'express';
import type { Request, Response } from 'express';

interface SentenceData {
  id: string;
  text: string;
  score: number;
  color: string;
  hue: number;
  saturation: number;
  lightness: number;
  charCount: number;
  startIndex: number;
  endIndex: number;
}

interface SessionData {
  id: string;
  text: string;
  sentences: SentenceData[];
  createdAt: number;
}

const app = express();
const PORT = 3006;

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

const storage: Map<string, SessionData> = new Map();

function generateId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

interface SaveRequestBody {
  text: string;
  sentences: SentenceData[];
}

app.post('/api/save', (req: Request<{}, {}, SaveRequestBody>, res: Response) => {
  try {
    const { text, sentences } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Invalid text data' });
      return;
    }

    if (!Array.isArray(sentences)) {
      res.status(400).json({ error: 'Invalid sentences data' });
      return;
    }

    let id: string;
    do {
      id = generateId();
    } while (storage.has(id));

    const session: SessionData = {
      id,
      text,
      sentences,
      createdAt: Date.now(),
    };

    storage.set(id, session);

    res.json({ id });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/load/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 6) {
      res.status(400).json({ error: 'Invalid ID format' });
      return;
    }

    const session = storage.get(id);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({
      id: session.id,
      text: session.text,
      sentences: session.sentences,
      createdAt: session.createdAt,
    });
  } catch (err) {
    console.error('Load error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', storageSize: storage.size });
});

app.listen(PORT, () => {
  console.log(`[Server] Emotion Chromatography API running on http://localhost:${PORT}`);
});
