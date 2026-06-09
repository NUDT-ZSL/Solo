import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '1mb' }));

interface Bottle {
  id: string;
  color: string;
  text: string;
  createdAt: number;
  emojis: string[];
  expiresAt: number;
}

const BOTTLE_LIFETIME = 24 * 60 * 60 * 1000;
let bottles: Bottle[] = [];

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'bottles.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadBottles() {
  ensureDataDir();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data) as Bottle[];
      const now = Date.now();
      bottles = parsed.filter(b => b.expiresAt > now);
      saveBottles();
    }
  } catch (e) {
    console.error('Failed to load bottles:', e);
    bottles = [];
  }
}

function saveBottles() {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(bottles, null, 2));
  } catch (e) {
    console.error('Failed to save bottles:', e);
  }
}

function cleanExpiredBottles() {
  const now = Date.now();
  const before = bottles.length;
  bottles = bottles.filter(b => b.expiresAt > now);
  if (bottles.length !== before) {
    saveBottles();
  }
}

function scheduleMidnightCleanup() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const delay = nextMidnight.getTime() - now.getTime();
  
  setTimeout(() => {
    bottles = [];
    saveBottles();
    console.log('[Midnight Cleanup] All bottles cleared by ocean tide');
    scheduleMidnightCleanup();
  }, delay);
}

loadBottles();
scheduleMidnightCleanup();
setInterval(cleanExpiredBottles, 60 * 1000);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/upload', (req, res) => {
  try {
    const { color, text } = req.body;
    
    if (!color || typeof color !== 'string') {
      return res.status(400).json({ error: '无效的情绪颜色' });
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: '请输入文字内容' });
    }
    if (text.length > 200) {
      return res.status(400).json({ error: '文字内容不能超过200字' });
    }

    const now = Date.now();
    const bottle: Bottle = {
      id: uuidv4(),
      color: color,
      text: text.trim(),
      createdAt: now,
      emojis: [],
      expiresAt: now + BOTTLE_LIFETIME
    };

    bottles.push(bottle);
    saveBottles();

    res.status(201).json({
      success: true,
      bottle: {
        id: bottle.id,
        color: bottle.color,
        text: bottle.text,
        createdAt: bottle.createdAt,
        emojis: bottle.emojis
      }
    });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/bottles', (_req, res) => {
  cleanExpiredBottles();
  res.json({
    count: bottles.length,
    bottles: bottles.map(b => ({
      id: b.id,
      color: b.color,
      text: b.text,
      createdAt: b.createdAt,
      emojiCount: b.emojis.length
    }))
  });
});

app.get('/bottle', (_req, res) => {
  cleanExpiredBottles();
  
  if (bottles.length === 0) {
    return res.status(404).json({ error: '海洋中暂时没有漂流瓶，快来投放第一个吧！' });
  }

  const randomIndex = Math.floor(Math.random() * bottles.length);
  const bottle = bottles[randomIndex];

  res.json({
    id: bottle.id,
    color: bottle.color,
    text: bottle.text,
    createdAt: bottle.createdAt,
    emojis: bottle.emojis
  });
});

app.get('/bottle/:id', (req, res) => {
  cleanExpiredBottles();
  const { id } = req.params;
  const bottle = bottles.find(b => b.id === id);

  if (!bottle) {
    return res.status(404).json({ error: '该漂流瓶已随潮汐消失...' });
  }

  res.json({
    id: bottle.id,
    color: bottle.color,
    text: bottle.text,
    createdAt: bottle.createdAt,
    emojis: bottle.emojis
  });
});

app.post('/respond/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: '无效的表情' });
    }

    const validEmojis = ['😊', '😔', '😡', '😢', '😍', '🤔', '😌', '😄'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ error: '无效的表情类型' });
    }

    cleanExpiredBottles();
    const bottleIndex = bottles.findIndex(b => b.id === id);

    if (bottleIndex === -1) {
      return res.status(404).json({ error: '该漂流瓶已随潮汐消失...' });
    }

    bottles[bottleIndex].emojis.push(emoji);
    saveBottles();

    res.json({
      success: true,
      emojis: bottles[bottleIndex].emojis,
      emojiCount: bottles[bottleIndex].emojis.length
    });
  } catch (e) {
    console.error('Respond error:', e);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', bottleCount: bottles.length });
});

app.listen(PORT, () => {
  console.log(`🌊 情绪漂流瓶服务器已启动: http://localhost:${PORT}`);
  console.log(`📦 当前海洋中有 ${bottles.length} 个漂流瓶`);
});
