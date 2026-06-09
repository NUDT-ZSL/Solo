import express, { Request, Response } from 'express';
import cors from 'cors';
import { randomBytes } from 'node:crypto';

interface CardParams {
  baseColor: string;
  gradientAngle: number;
  glowRadius: number;
  glowOpacity: number;
  borderRadius: number;
  backdropBlur: number;
}

interface SavedCard extends CardParams {
  id: string;
  createdAt: number;
}

const app = express();
const PORT = 3001;
const MAX_HISTORY_LIMIT = 50;

app.use(cors());
app.use(express.json());

const cardStorage = new Map<string, SavedCard>();
let historyList: SavedCard[] = [];

const generateShortId = (): string => {
  return randomBytes(4).toString('hex').slice(0, 8);
};

app.post('/api/cards/share', (req: Request, res: Response) => {
  try {
    const params: CardParams = req.body;
    const {
      baseColor,
      gradientAngle,
      glowRadius,
      glowOpacity,
      borderRadius,
      backdropBlur
    } = params;

    if (!baseColor || gradientAngle === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const id = generateShortId();
    const savedCard: SavedCard = {
      id,
      baseColor,
      gradientAngle,
      glowRadius,
      glowOpacity,
      borderRadius,
      backdropBlur,
      createdAt: Date.now()
    };

    cardStorage.set(id, savedCard);
    historyList.unshift(savedCard);

    if (historyList.length > MAX_HISTORY_LIMIT) {
      const removed = historyList.pop();
      if (removed) {
        cardStorage.delete(removed.id);
      }
    }

    res.json({ id, shareUrl: `/share/${id}` });
  } catch (error) {
    res.status(500).json({ error: '保存卡片失败' });
  }
});

app.get('/api/cards/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const card = cardStorage.get(id);

  if (!card) {
    return res.status(404).json({ error: '卡片未找到' });
  }

  res.json(card);
});

app.get('/api/cards', (_req: Request, res: Response) => {
  res.json(historyList);
});

app.delete('/api/cards/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const exists = cardStorage.has(id);

  if (!exists) {
    return res.status(404).json({ error: '卡片未找到' });
  }

  cardStorage.delete(id);
  historyList = historyList.filter(card => card.id !== id);

  res.json({ success: true });
});

app.delete('/api/cards', (_req: Request, res: Response) => {
  cardStorage.clear();
  historyList = [];
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`光晕卡片工坊后端服务运行在 http://localhost:${PORT}`);
});
