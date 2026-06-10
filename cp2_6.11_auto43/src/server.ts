import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import type { EmotionRecord, Echo, StatsData } from '../shared/types';

dotenv.config();

interface StoreRecord extends EmotionRecord {}
interface StoreEcho extends Echo {}

const trajectories = new Map<string, StoreRecord[]>();
const echoes = new Map<string, StoreEcho[]>();
const shares = new Map<string, { userId: string; dateRange: [string, string] }>();

function ensureUser(userId: string): StoreRecord[] {
  if (!trajectories.has(userId)) {
    trajectories.set(userId, generateSampleData(userId));
  }
  return trajectories.get(userId)!;
}

function generateSampleData(userId: string): StoreRecord[] {
  const records: StoreRecord[] = [];
  const colors = [
    '#FF6B6B', '#FF8E53', '#FFC857', '#A8E06C', '#56C596',
    '#4ECDC4', '#45B7D1', '#5B8DEF', '#7C6EF6', '#B06AB3',
    '#E875A8', '#FF9FB2',
  ];
  const texts = [
    '阳光正好', '有些疲惫', '充满期待', '平静如水', '小确幸',
    '压力山大', '灵感涌现', '温暖如春', '思绪万千', '自在悠然',
    '心花怒放', '淡淡忧伤',
  ];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (Math.random() > 0.3) {
      const idx = Math.floor(Math.random() * 12);
      records.push({
        id: uuidv4(),
        userId,
        date: d.toISOString().slice(0, 10),
        color: colors[idx],
        text: texts[idx],
        intensity: Math.floor(Math.random() * 5) + 1,
      });
    }
  }
  return records;
}

const app: express.Application = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' });
});

app.get('/api/trajectories', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user_default';
  const records = ensureUser(userId);
  const filteredRecords = records.filter((r) => r.userId === userId);
  const allEchoes: StoreEcho[] = [];
  echoes.forEach((list) => allEchoes.push(...list));
  const relatedEchoes = allEchoes.filter((e) => {
    const rec = filteredRecords.find((r) => r.id === e.trajectoryId);
    return rec !== undefined;
  });
  res.json({ records: filteredRecords, echoes: relatedEchoes });
});

app.post('/api/trajectories', (req: Request, res: Response) => {
  const userId = req.body.userId || 'user_default';
  const records = ensureUser(userId);
  const newRecord: StoreRecord = {
    id: uuidv4(),
    userId,
    date: req.body.date,
    color: req.body.color,
    text: req.body.text,
    intensity: req.body.intensity || 3,
    position: req.body.position,
  };
  const existingIdx = records.findIndex((r) => r.date === newRecord.date && r.userId === userId);
  if (existingIdx >= 0) {
    records[existingIdx] = { ...records[existingIdx], ...newRecord, id: records[existingIdx].id };
    res.json(records[existingIdx]);
  } else {
    records.push(newRecord);
    records.sort((a, b) => a.date.localeCompare(b.date));
    res.json(newRecord);
  }
});

app.put('/api/trajectories/:id', (req: Request, res: Response) => {
  const userId = req.body.userId || 'user_default';
  const records = ensureUser(userId);
  const idx = records.findIndex((r) => r.id === req.params.id && r.userId === userId);
  if (idx < 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  records[idx] = { ...records[idx], ...req.body, id: records[idx].id, userId: records[idx].userId };
  res.json(records[idx]);
});

app.delete('/api/trajectories/:id', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user_default';
  const records = ensureUser(userId);
  const idx = records.findIndex((r) => r.id === req.params.id && r.userId === userId);
  if (idx < 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const deletedId = records[idx].id;
  records.splice(idx, 1);
  echoes.delete(deletedId);
  res.json({ success: true });
});

app.post('/api/echo', (req: Request, res: Response) => {
  const newEcho: StoreEcho = {
    id: uuidv4(),
    trajectoryId: req.body.trajectoryId,
    targetDate: req.body.targetDate,
    color: req.body.color,
    text: req.body.text,
    createdAt: new Date().toISOString(),
  };
  if (!echoes.has(newEcho.trajectoryId)) {
    echoes.set(newEcho.trajectoryId, []);
  }
  echoes.get(newEcho.trajectoryId)!.push(newEcho);
  res.json(newEcho);
});

app.get('/api/stats', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user_default';
  const records = ensureUser(userId).filter((r) => r.userId === userId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthRecords = records.filter((r) => r.date >= monthStart);

  const colorCount = new Map<string, number>();
  monthRecords.forEach((r) => {
    colorCount.set(r.color, (colorCount.get(r.color) || 0) + 1);
  });
  const total = monthRecords.length || 1;
  const monthlyDistribution = Array.from(colorCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({ color, count, percentage: Math.round((count / total) * 100) }));

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekRecords = records.filter((r) => r.date >= weekStartStr);
  const weeklyTrend = weekRecords.map((r) => ({
    date: r.date,
    intensity: r.intensity,
    color: r.color,
  }));

  const statsData: StatsData = {
    monthlyDistribution,
    weeklyTrend,
    totalDays: records.length,
  };
  res.json(statsData);
});

app.post('/api/share', (req: Request, res: Response) => {
  const shareId = uuidv4().slice(0, 8);
  shares.set(shareId, {
    userId: req.body.userId || 'user_default',
    dateRange: req.body.dateRange || ['', ''],
  });
  res.json({ shareId, url: `/share/${shareId}` });
});

app.get('/api/share/:shareId', (req: Request, res: Response) => {
  const share = shares.get(req.params.shareId);
  if (!share) {
    res.status(404).json({ error: 'Share not found' });
    return;
  }
  const records = ensureUser(share.userId).filter((r) => r.userId === share.userId);
  const allEchoes: StoreEcho[] = [];
  echoes.forEach((list) => allEchoes.push(...list));
  const relatedEchoes = allEchoes.filter((e) => {
    const rec = records.find((r) => r.id === e.trajectoryId);
    return rec !== undefined;
  });
  res.json({
    records,
    echoes: relatedEchoes,
    shareId: req.params.shareId,
  });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ success: false, error: 'Server internal error' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'lambda') {
  app.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`);
  });
}

export default app;
