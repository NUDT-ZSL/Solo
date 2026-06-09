import express from 'express';
import cors from 'cors';

type BottleColor = 'red' | 'blue' | 'green' | 'purple' | 'gold';

interface Bottle {
  id: string;
  message: string;
  unlockDate: string;
  color: BottleColor;
  createdAt: string;
}

interface ViewRecord {
  id: string;
  bottleId: string;
  message: string;
  openedAt: string;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const bottles: Bottle[] = [];
const viewRecords: ViewRecord[] = [];

const VALID_COLORS: BottleColor[] = ['red', 'blue', 'green', 'purple', 'gold'];

function generateId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function generateUniqueId(): string {
  let id: string;
  do {
    id = generateId();
  } while (bottles.some((b) => b.id === id));
  return id;
}

app.post('/api/bottle', (req, res) => {
  const { message, unlockDate, color } = req.body as {
    message: string;
    unlockDate: string;
    color: BottleColor;
  };

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: '消息不能为空' });
  }

  if (message.length > 500) {
    return res.status(400).json({ error: '消息长度不能超过500字' });
  }

  if (!unlockDate || isNaN(Date.parse(unlockDate))) {
    return res.status(400).json({ error: '解锁日期无效' });
  }

  const unlockTime = new Date(unlockDate).getTime();
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  if (unlockTime <= now) {
    return res.status(400).json({ error: '解锁日期必须是未来日期' });
  }

  if (unlockTime - now > thirtyDaysMs) {
    return res.status(400).json({ error: '解锁日期不能超过未来30天' });
  }

  if (!VALID_COLORS.includes(color)) {
    return res.status(400).json({ error: '瓶身颜色无效' });
  }

  const newBottle: Bottle = {
    id: generateUniqueId(),
    message: message.trim(),
    unlockDate: new Date(unlockDate).toISOString(),
    color,
    createdAt: new Date().toISOString(),
  };

  bottles.push(newBottle);
  return res.status(201).json({ id: newBottle.id });
});

app.get('/api/bottle/:id', (req, res) => {
  const { id } = req.params;
  const bottle = bottles.find((b) => b.id === id.toUpperCase());

  if (!bottle) {
    return res.status(404).json({ error: '漂流瓶不存在' });
  }

  const now = Date.now();
  const unlockTime = new Date(bottle.unlockDate).getTime();
  const isUnlocked = now >= unlockTime;

  if (isUnlocked) {
    const existingRecord = viewRecords.find((r) => r.bottleId === bottle.id);
    if (!existingRecord) {
      viewRecords.unshift({
        id: generateUniqueId(),
        bottleId: bottle.id,
        message: bottle.message,
        openedAt: new Date().toISOString(),
      });
    }
  }

  return res.json({
    id: bottle.id,
    message: isUnlocked ? bottle.message : null,
    unlockDate: bottle.unlockDate,
    color: bottle.color,
    createdAt: bottle.createdAt,
    isUnlocked,
  });
});

app.get('/api/stats', (_req, res) => {
  const now = Date.now();
  const unlockedCount = bottles.filter(
    (b) => now < new Date(b.unlockDate).getTime()
  ).length;

  const recentOpened = viewRecords.slice(0, 5).map((r) => ({
    id: r.bottleId,
    summary:
      r.message.length > 20 ? r.message.substring(0, 20) + '...' : r.message,
    openedAt: r.openedAt,
  }));

  return res.json({
    lockedCount: unlockedCount,
    totalCount: bottles.length,
    recentOpened,
  });
});

app.get('/api/bottles', (_req, res) => {
  const now = Date.now();
  const list = bottles.map((b) => ({
    id: b.id,
    unlockDate: b.unlockDate,
    color: b.color,
    createdAt: b.createdAt,
    isUnlocked: now >= new Date(b.unlockDate).getTime(),
  }));
  return res.json(list);
});

app.listen(PORT, () => {
  console.log(`[SERVER] 漂流瓶后端服务运行在 http://localhost:${PORT}`);
});
