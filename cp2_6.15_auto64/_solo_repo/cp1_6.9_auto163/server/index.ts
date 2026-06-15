import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

export type WeatherType = 'rain' | 'snow' | 'fog' | 'sunset';
export type FrameStyle = 'simple' | 'film' | 'dashed' | 'gold' | 'stamp';

export interface PostcardData {
  id: string;
  imageData: string;
  weather: WeatherType;
  timeOfDay: number;
  frameStyle: FrameStyle;
  text: string;
  dominantColor: { r: number; g: number; b: number };
  createdAt: number;
}

const MAX_STORAGE = 20;
const postcardStore = new Map<string, PostcardData>();
const postcardOrder: string[] = [];

function addPostcard(data: PostcardData): void {
  postcardStore.set(data.id, data);
  postcardOrder.push(data.id);
  while (postcardOrder.length > MAX_STORAGE) {
    const oldestId = postcardOrder.shift();
    if (oldestId) {
      postcardStore.delete(oldestId);
    }
  }
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', stored: postcardStore.size });
});

app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const {
      imageData,
      weather,
      timeOfDay,
      frameStyle,
      text,
      dominantColor,
    } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const id = uuidv4();
    const postcard: PostcardData = {
      id,
      imageData,
      weather: weather || 'rain',
      timeOfDay: typeof timeOfDay === 'number' ? timeOfDay : 12,
      frameStyle: frameStyle || 'simple',
      text: text || '',
      dominantColor: dominantColor || { r: 128, g: 128, b: 128 },
      createdAt: Date.now(),
    };

    addPostcard(postcard);

    return res.json({
      id,
      url: `/postcard/${id}`,
      createdAt: postcard.createdAt,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/postcard/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postcard = postcardStore.get(id);

    if (!postcard) {
      return res.status(404).json({ error: 'Postcard not found' });
    }

    return res.json(postcard);
  } catch (error) {
    console.error('Get postcard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Mirage Postcard API running on port ${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});
