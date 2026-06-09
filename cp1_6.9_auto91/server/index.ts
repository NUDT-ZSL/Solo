import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

interface Capsule {
  id: string;
  shareId: string;
  title: string;
  content: string;
  images: string[];
  audio: string | null;
  password: string;
  createdAt: number;
  lastAccessedAt: number;
  archived: boolean;
}

interface IpAccessRecord {
  [shareId: string]: {
    count: number;
    date: string;
  };
}

const capsules = new Map<string, Capsule>();
const capsulesByShareId = new Map<string, Capsule>();
const ipAccessMap = new Map<string, IpAccessRecord>();

const generateShareId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
};

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const checkAndArchive = () => {
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  capsules.forEach((capsule) => {
    if (!capsule.archived && now - capsule.lastAccessedAt > THIRTY_DAYS) {
      capsule.archived = true;
    }
  });
};

setInterval(checkAndArchive, 60 * 60 * 1000);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/api/capsules', (req: Request, res: Response) => {
  checkAndArchive();
  const showArchived = req.query.archived === 'true';
  const result = Array.from(capsules.values())
    .filter((c) => (showArchived ? c.archived : !c.archived))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ id, shareId, title, content, images, audio, createdAt, lastAccessedAt, archived }) => ({
      id,
      shareId,
      title,
      content,
      images,
      audio: audio ? true : false,
      createdAt,
      lastAccessedAt,
      archived,
    }));
  res.json(result);
});

app.get('/api/capsules/search', (req: Request, res: Response) => {
  const dateQuery = req.query.date as string;
  if (!dateQuery) {
    return res.status(400).json({ error: '日期参数缺失' });
  }
  checkAndArchive();
  const targetDate = new Date(dateQuery).toISOString().split('T')[0];
  const result = Array.from(capsules.values())
    .filter((c) => {
      const createdDate = new Date(c.createdAt).toISOString().split('T')[0];
      return createdDate === targetDate;
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ id, shareId, title, content, images, audio, createdAt, lastAccessedAt, archived }) => ({
      id,
      shareId,
      title,
      content,
      images,
      audio: audio ? true : false,
      createdAt,
      lastAccessedAt,
      archived,
    }));
  res.json(result);
});

app.get('/api/capsules/:shareId', (req: Request, res: Response) => {
  const { shareId } = req.params;
  const capsule = capsulesByShareId.get(shareId);
  if (!capsule) {
    return res.status(404).json({ error: '胶囊不存在' });
  }
  const ip = getClientIp(req);
  const today = getToday();
  if (!ipAccessMap.has(ip)) {
    ipAccessMap.set(ip, {});
  }
  const ipRecord = ipAccessMap.get(ip)!;
  if (!ipRecord[shareId] || ipRecord[shareId].date !== today) {
    ipRecord[shareId] = { count: 0, date: today };
  }
  ipRecord[shareId].count++;
  if (ipRecord[shareId].count > 5) {
    return res.status(429).json({ error: '今日访问次数已达上限（5次），请明天再来' });
  }
  capsule.lastAccessedAt = Date.now();
  res.json({
    id: capsule.id,
    shareId: capsule.shareId,
    title: capsule.title,
    content: capsule.content,
    images: capsule.images,
    audio: capsule.audio,
    createdAt: capsule.createdAt,
    lastAccessedAt: capsule.lastAccessedAt,
    archived: capsule.archived,
    isOwner: false,
    accessCountLeft: 5 - ipRecord[shareId].count,
  });
});

app.post('/api/capsules', (req: Request, res: Response) => {
  const { title, content, images, audio, password } = req.body;
  if (!password || !/^\d{6}$/.test(password)) {
    return res.status(400).json({ error: '密码必须为6位数字' });
  }
  if (images && images.length > 5) {
    return res.status(400).json({ error: '图片最多5张' });
  }
  let shareId: string;
  do {
    shareId = generateShareId();
  } while (capsulesByShareId.has(shareId));
  const id = uuidv4();
  const now = Date.now();
  const capsule: Capsule = {
    id,
    shareId,
    title: title || '',
    content: content || '',
    images: images || [],
    audio: audio || null,
    password,
    createdAt: now,
    lastAccessedAt: now,
    archived: false,
  };
  capsules.set(id, capsule);
  capsulesByShareId.set(shareId, capsule);
  res.status(201).json({
    id,
    shareId,
    createdAt: now,
  });
});

app.put('/api/capsules/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content, images, audio, password } = req.body;
  const capsule = capsules.get(id);
  if (!capsule) {
    return res.status(404).json({ error: '胶囊不存在' });
  }
  if (!password || capsule.password !== password) {
    return res.status(401).json({ error: '密码错误' });
  }
  if (images && images.length > 5) {
    return res.status(400).json({ error: '图片最多5张' });
  }
  capsule.title = title !== undefined ? title : capsule.title;
  capsule.content = content !== undefined ? content : capsule.content;
  capsule.images = images !== undefined ? images : capsule.images;
  capsule.audio = audio !== undefined ? audio : capsule.audio;
  capsule.lastAccessedAt = Date.now();
  capsule.archived = false;
  res.json({
    id: capsule.id,
    shareId: capsule.shareId,
    updatedAt: Date.now(),
  });
});

app.delete('/api/capsules/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;
  const capsule = capsules.get(id);
  if (!capsule) {
    return res.status(404).json({ error: '胶囊不存在' });
  }
  if (!password || capsule.password !== password) {
    return res.status(401).json({ error: '密码错误' });
  }
  capsulesByShareId.delete(capsule.shareId);
  capsules.delete(id);
  res.json({ success: true });
});

app.post('/api/capsules/:id/restore', (req: Request, res: Response) => {
  const { id } = req.params;
  const capsule = capsules.get(id);
  if (!capsule) {
    return res.status(404).json({ error: '胶囊不存在' });
  }
  capsule.archived = false;
  capsule.lastAccessedAt = Date.now();
  res.json({ success: true, restoredAt: Date.now() });
});

app.post('/api/capsules/:id/verify', (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;
  const capsule = capsules.get(id);
  if (!capsule) {
    return res.status(404).json({ error: '胶囊不存在' });
  }
  if (!password || capsule.password !== password) {
    return res.status(401).json({ error: '密码错误', success: false });
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Time Capsule 后端服务已启动: http://localhost:${PORT}`);
});
