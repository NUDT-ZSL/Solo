import express from 'express';
import cors from 'cors';
import multer from 'multer';

export interface Card {
  id: string;
  title: string;
  note: string;
  date: string;
  lat: number;
  lng: number;
  city: string;
  emotion: EmotionType;
  image: string;
  dominantColor: string;
  order: number;
}

export type EmotionType = '惊喜' | '宁静' | '怀念' | '冒险' | '浪漫' | '激动';

export const EMOTION_COLORS: Record<EmotionType, string> = {
  '惊喜': '#FF6B35',
  '宁静': '#4ECDC4',
  '怀念': '#9B59B6',
  '冒险': '#E74C3C',
  '浪漫': '#FF69B4',
  '激动': '#F39C12'
};

export interface CityOption {
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: CityOption[] = [
  { name: '北京', lat: 39.9042, lng: 116.4074 },
  { name: '上海', lat: 31.2304, lng: 121.4737 },
  { name: '东京', lat: 35.6762, lng: 139.6503 },
  { name: '巴黎', lat: 48.8566, lng: 2.3522 },
  { name: '伦敦', lat: 51.5074, lng: -0.1278 },
  { name: '纽约', lat: 40.7128, lng: -74.0060 },
  { name: '悉尼', lat: -33.8688, lng: 151.2093 },
  { name: '罗马', lat: 41.9028, lng: 12.4964 },
  { name: '迪拜', lat: 25.2048, lng: 55.2708 },
  { name: '开罗', lat: 30.0444, lng: 31.2357 }
];

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

let cards: Card[] = [];
let deletedCards: Card[] = [];
let nextId = 1;

function generateId(): string {
  return `card_${nextId++}_${Date.now()}`;
}

app.get('/api/cities', (_req, res) => {
  res.json(CITIES);
});

app.get('/api/cards', (_req, res) => {
  res.json(cards.sort((a, b) => a.order - b.order));
});

app.post('/api/cards', upload.single('image'), (req, res) => {
  try {
    const { title, note, date, lat, lng, city, emotion, dominantColor } = req.body;

    let imageBase64 = '';
    if (req.file) {
      imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body.image) {
      imageBase64 = req.body.image;
    }

    const newCard: Card = {
      id: generateId(),
      title: title || '未命名卡片',
      note: note || '',
      date: date || new Date().toISOString().split('T')[0],
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      city: city || '',
      emotion: emotion as EmotionType || '宁静',
      image: imageBase64,
      dominantColor: dominantColor || '#4ECDC4',
      order: cards.length
    };

    cards.push(newCard);
    res.status(201).json(newCard);
  } catch (error) {
    res.status(500).json({ error: '创建卡片失败' });
  }
});

app.put('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const index = cards.findIndex((c) => c.id === id);

  if (index === -1) {
    res.status(404).json({ error: '卡片不存在' });
    return;
  }

  cards[index] = { ...cards[index], ...req.body };
  res.json(cards[index]);
});

app.put('/api/cards/reorder', (req, res) => {
  const { orderedIds }: { orderedIds: string[] } = req.body;
  orderedIds.forEach((id, order) => {
    const card = cards.find((c) => c.id === id);
    if (card) {
      card.order = order;
    }
  });
  res.json({ success: true });
});

app.delete('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const index = cards.findIndex((c) => c.id === id);

  if (index === -1) {
    res.status(404).json({ error: '卡片不存在' });
    return;
  }

  const [deletedCard] = cards.splice(index, 1);
  deletedCards.push(deletedCard);

  setTimeout(() => {
    deletedCards = deletedCards.filter((c) => c.id !== id);
  }, 6000);

  res.json({ success: true, card: deletedCard });
});

app.post('/api/cards/:id/restore', (req, res) => {
  const { id } = req.params;
  const deletedIndex = deletedCards.findIndex((c) => c.id === id);

  if (deletedIndex === -1) {
    res.status(404).json({ error: '找不到已删除的卡片' });
    return;
  }

  const [restoredCard] = deletedCards.splice(deletedIndex, 1);
  cards.push(restoredCard);
  res.json(restoredCard);
});

app.get('/api/emotions', (_req, res) => {
  res.json(Object.keys(EMOTION_COLORS));
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});

export default app;
