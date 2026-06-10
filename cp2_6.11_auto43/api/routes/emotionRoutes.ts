import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { EmotionRecord, Echo, StatsData } from '../../shared/types.js';

const router = Router();

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

router.get('/trajectories', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user_default';
  const records = ensureUser(userId);
  const allEchoes: StoreEcho[] = [];
  echoes.forEach((list) => allEchoes.push(...list));
  res.json({ records, echoes: allEchoes.filter((e) => e.trajectoryId.startsWith(userId)) });
});

router.post('/trajectories', (req: Request, res: Response) => {
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
  const existingIdx = records.findIndex((r) => r.date === newRecord.date);
  if (existingIdx >= 0) {
    records[existingIdx] = { ...records[existingIdx], ...newRecord, id: records[existingIdx].id };
    res.json(records[existingIdx]);
  } else {
    records.push(newRecord);
    records.sort((a, b) => a.date.localeCompare(b.date));
    res.json(newRecord);
  }
});

router.put('/trajectories/:id', (req: Request, res: Response) => {
  const userId = req.body.userId || 'user_default';
  const records = ensureUser(userId);
  const idx = records.findIndex((r) => r.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  records[idx] = { ...records[idx], ...req.body, id: records[idx].id };
  res.json(records[idx]);
});

router.delete('/trajectories/:id', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user_default';
  const records = ensureUser(userId);
  const idx = records.findIndex((r) => r.id === req.params.id);
  if (idx < 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  records.splice(idx, 1);
  echoes.delete(req.params.id);
  res.json({ success: true });
});

router.post('/echo', (req: Request, res: Response) => {
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

router.get('/stats', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'user_default';
  const records = ensureUser(userId);
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

router.post('/share', (req: Request, res: Response) => {
  const shareId = uuidv4().slice(0, 8);
  shares.set(shareId, {
    userId: req.body.userId || 'user_default',
    dateRange: req.body.dateRange || ['', ''],
  });
  res.json({ shareId, url: `/share/${shareId}` });
});

router.get('/share/:shareId', (req: Request, res: Response) => {
  const share = shares.get(req.params.shareId);
  if (!share) {
    res.status(404).json({ error: 'Share not found' });
    return;
  }
  const records = ensureUser(share.userId);
  const allEchoes: StoreEcho[] = [];
  echoes.forEach((list) => allEchoes.push(...list));
  res.json({
    records,
    echoes: allEchoes.filter((e) => e.trajectoryId.startsWith(share.userId)),
    shareId: req.params.shareId,
  });
});

export default router;
