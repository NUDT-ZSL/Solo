import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface WordCloudData {
  words: Array<{
    text: string;
    x: number;
    y: number;
    fontSize: number;
    rotation: number;
    color: string;
    opacity: number;
    fontFamily: string;
  }>;
  colorSchemeIndex: number;
  createdAt: number;
}

const wordCloudStore = new Map<string, WordCloudData>();

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

app.post('/api/save', (req: Request, res: Response) => {
  try {
    const data = req.body as WordCloudData;
    
    if (!data || !data.words || !Array.isArray(data.words)) {
      return res.status(400).json({ error: 'Invalid word cloud data' });
    }

    let id: string;
    do {
      id = generateId();
    } while (wordCloudStore.has(id));

    data.createdAt = Date.now();
    wordCloudStore.set(id, data);

    res.json({ id, url: `http://localhost:5173/view/${id}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save word cloud' });
  }
});

app.get('/api/get/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = wordCloudStore.get(id);

    if (!data) {
      return res.status(404).json({ error: 'Word cloud not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get word cloud' });
  }
});

app.listen(PORT, () => {
  console.log(`Word Cloud Server running on http://localhost:${PORT}`);
});
