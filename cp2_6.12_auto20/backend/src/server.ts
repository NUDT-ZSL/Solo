import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { Hall, Artwork, HallConnection } from './types';

const app = express();
const PORT = 4000;

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DATA_FILE = path.join(__dirname, '..', 'data', 'gallery-data.json');
const DATA_DIR = path.dirname(DATA_FILE);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage });

const halls = new Map<string, Hall>();

function saveData() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const arr = Array.from(halls.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

type Direction = 'north' | 'south' | 'east' | 'west';
const DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];

function validateConnection(data: unknown): HallConnection | null {
  if (typeof data !== 'object' || data === null) return null;
  const c = data as Record<string, unknown>;
  if (typeof c.targetHallId !== 'string' || c.targetHallId === '') return null;
  if (!DIRECTIONS.includes(c.direction as Direction)) return null;
  if (typeof c.corridorLength !== 'number' || !Number.isFinite(c.corridorLength) || c.corridorLength <= 0) return null;
  return c as unknown as HallConnection;
}

function validateArtwork(data: unknown): Artwork | null {
  if (typeof data !== 'object' || data === null) return null;
  const a = data as Record<string, unknown>;
  if (typeof a.id !== 'string' || a.id === '') return null;
  if (typeof a.hallId !== 'string') return null;
  if (typeof a.title !== 'string') return null;
  if (typeof a.artist !== 'string') return null;
  if (typeof a.description !== 'string') return null;
  if (typeof a.imageUrl !== 'string') return null;
  if (typeof a.year !== 'number' || !Number.isFinite(a.year)) return null;
  if (!DIRECTIONS.includes(a.wall as Direction)) return null;
  if (typeof a.positionX !== 'number' || !Number.isFinite(a.positionX)) return null;
  if (typeof a.positionY !== 'number' || !Number.isFinite(a.positionY)) return null;
  if (typeof a.width !== 'number' || !Number.isFinite(a.width)) return null;
  if (typeof a.height !== 'number' || !Number.isFinite(a.height)) return null;
  return a as unknown as Artwork;
}

function validateHall(data: unknown): Hall | null {
  if (typeof data !== 'object' || data === null) return null;
  const h = data as Record<string, unknown>;
  if (typeof h.id !== 'string' || h.id === '') return null;
  if (typeof h.name !== 'string') return null;
  if (typeof h.width !== 'number' || !Number.isFinite(h.width) || h.width <= 0) return null;
  if (typeof h.height !== 'number' || !Number.isFinite(h.height) || h.height <= 0) return null;
  if (typeof h.depth !== 'number' || !Number.isFinite(h.depth) || h.depth <= 0) return null;
  if (typeof h.wallColor !== 'string' || !h.wallColor.startsWith('#')) return null;
  if (typeof h.floorTexture !== 'string') return null;
  if (!Array.isArray(h.connections)) return null;
  if (!Array.isArray(h.artworks)) return null;

  const validConnections: HallConnection[] = [];
  for (const conn of h.connections) {
    const vc = validateConnection(conn);
    if (vc === null) return null;
    validConnections.push(vc);
  }

  const validArtworks: Artwork[] = [];
  for (const art of h.artworks) {
    const va = validateArtwork(art);
    if (va === null) return null;
    validArtworks.push(va);
  }

  return {
    id: h.id,
    name: h.name,
    width: h.width,
    height: h.height,
    depth: h.depth,
    wallColor: h.wallColor,
    floorTexture: h.floorTexture,
    connections: validConnections,
    artworks: validArtworks,
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return false;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      console.error('Loaded data is not an array');
      return false;
    }
    halls.clear();
    let validCount = 0;
    for (const item of data) {
      const valid = validateHall(item);
      if (valid !== null) {
        halls.set(valid.id, valid);
        validCount++;
      } else {
        console.warn('Skipping invalid hall entry:', item);
      }
    }
    if (validCount === 0) return false;
    return true;
  } catch (e) {
    console.error('Failed to load data:', e);
    return false;
  }
}

app.get('/api/halls', (_req, res) => {
  const list = Array.from(halls.values());
  res.json(list);
});

app.get('/api/halls/:id', (req, res) => {
  const hall = halls.get(req.params.id);
  if (!hall) {
    return res.status(404).json({ error: 'Hall not found' });
  }
  res.json(hall);
});

app.post('/api/halls', (req, res) => {
  const { name, width, height, depth, wallColor, floorTexture, connections } = req.body;
  const id = uuidv4();
  const hall: Hall = {
    id,
    name: name || 'Untitled Hall',
    width: Number(width) || 20,
    height: Number(height) || 5,
    depth: Number(depth) || 16,
    wallColor: wallColor || '#F5F0E8',
    floorTexture: floorTexture || '',
    connections: connections || [],
    artworks: [],
  };
  halls.set(id, hall);
  saveData();
  res.status(201).json(hall);
});

app.put('/api/halls/:id', (req, res) => {
  const hall = halls.get(req.params.id);
  if (!hall) {
    return res.status(404).json({ error: 'Hall not found' });
  }
  const { name, width, height, depth, wallColor, floorTexture, connections } = req.body;
  if (name !== undefined) hall.name = name;
  if (width !== undefined) hall.width = Number(width);
  if (height !== undefined) hall.height = Number(height);
  if (depth !== undefined) hall.depth = Number(depth);
  if (wallColor !== undefined) hall.wallColor = wallColor;
  if (floorTexture !== undefined) hall.floorTexture = floorTexture;
  if (connections !== undefined) hall.connections = connections;
  saveData();
  res.json(hall);
});

app.delete('/api/halls/:id', (req, res) => {
  const deleted = halls.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Hall not found' });
  }
  for (const hall of halls.values()) {
    hall.connections = hall.connections.filter(
      (c) => c.targetHallId !== req.params.id
    );
  }
  saveData();
  res.status(204).end();
});

app.post(
  '/api/halls/:hallId/artworks',
  upload.single('image'),
  (req, res) => {
    const hall = halls.get(req.params.hallId);
    if (!hall) {
      return res.status(404).json({ error: 'Hall not found' });
    }
    const file = req.file;
    const artwork: Artwork = {
      id: uuidv4(),
      hallId: req.params.hallId,
      title: req.body.title || 'Untitled',
      artist: req.body.artist || 'Unknown',
      year: req.body.year ? Number(req.body.year) : 0,
      description: req.body.description || '',
      imageUrl: file ? `/uploads/${file.filename}` : '',
      wall: req.body.wall || 'north',
      positionX: req.body.positionX ? Number(req.body.positionX) : 0,
      positionY: req.body.positionY ? Number(req.body.positionY) : 0,
      width: req.body.width ? Number(req.body.width) : 2,
      height: req.body.height ? Number(req.body.height) : 2,
    };
    hall.artworks.push(artwork);
    saveData();
    res.status(201).json(artwork);
  }
);

app.delete('/api/halls/:hallId/artworks/:artworkId', (req, res) => {
  const hall = halls.get(req.params.hallId);
  if (!hall) {
    return res.status(404).json({ error: 'Hall not found' });
  }
  const idx = hall.artworks.findIndex((a) => a.id === req.params.artworkId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Artwork not found' });
  }
  hall.artworks.splice(idx, 1);
  saveData();
  res.status(204).end();
});

app.get('/api/export', (_req, res) => {
  const arr = Array.from(halls.values());
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="gallery-backup.json"');
  res.json(arr);
});

app.post('/api/import', (req, res) => {
  const body = req.body;
  if (!Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  const validHalls: Hall[] = [];
  let skipped = 0;
  for (const item of body) {
    const valid = validateHall(item);
    if (valid !== null) {
      validHalls.push(valid);
    } else {
      skipped++;
    }
  }
  halls.clear();
  for (const h of validHalls) halls.set(h.id, h);
  saveData();
  res.status(200).json({ imported: validHalls.length, skipped });
});

function seedData() {
  const hall1Id = 'demo-hall-classical';
  const hall2Id = 'demo-hall-modern';

  const hall1: Hall = {
    id: hall1Id,
    name: '古典油画厅',
    width: 20,
    height: 5,
    depth: 16,
    wallColor: '#F5F0E8',
    floorTexture: '',
    connections: [
      { targetHallId: hall2Id, direction: 'east', corridorLength: 4 },
    ],
    artworks: [
      {
        id: uuidv4(),
        hallId: hall1Id,
        title: '蒙娜丽莎',
        artist: '列奥纳多·达·芬奇',
        year: 1503,
        description: '世界上最著名的肖像画，以其神秘的微笑闻名于世。这幅创作于文艺复兴时期的杰作现收藏于巴黎卢浮宫。',
        imageUrl: '',
        wall: 'north',
        positionX: 0,
        positionY: 1.5,
        width: 2,
        height: 2.8,
      },
      {
        id: uuidv4(),
        hallId: hall1Id,
        title: '星月夜',
        artist: '文森特·梵高',
        year: 1889,
        description: '梵高在圣雷米疗养院创作的不朽名作，描绘了充满动感的夜空。现收藏于纽约现代艺术博物馆。',
        imageUrl: '',
        wall: 'west',
        positionX: 2,
        positionY: 1.2,
        width: 2.5,
        height: 2,
      },
      {
        id: uuidv4(),
        hallId: hall1Id,
        title: '戴珍珠耳环的少女',
        artist: '约翰内斯·维米尔',
        year: 1665,
        description: '被誉为北方的蒙娜丽莎，维米尔最杰出的肖像画作品。现藏于荷兰海牙莫瑞泰斯皇家美术馆。',
        imageUrl: '',
        wall: 'east',
        positionX: 3,
        positionY: 1.5,
        width: 1.8,
        height: 2.4,
      },
    ],
  };

  const hall2: Hall = {
    id: hall2Id,
    name: '现代艺术厅',
    width: 18,
    height: 6,
    depth: 14,
    wallColor: '#EDE8D8',
    floorTexture: '',
    connections: [
      { targetHallId: hall1Id, direction: 'west', corridorLength: 4 },
    ],
    artworks: [
      {
        id: uuidv4(),
        hallId: hall2Id,
        title: '记忆的永恒',
        artist: '萨尔瓦多·达利',
        year: 1931,
        description: '超现实主义的标志性作品，描绘了融化的时钟。现藏于纽约现代艺术博物馆。',
        imageUrl: '',
        wall: 'north',
        positionX: 0,
        positionY: 1.8,
        width: 2.2,
        height: 1.6,
      },
      {
        id: uuidv4(),
        hallId: hall2Id,
        title: '呐喊',
        artist: '爱德华·蒙克',
        year: 1893,
        description: '表现主义的经典之作，表达了人类深层的焦虑与恐惧。奥斯陆国家美术馆藏。',
        imageUrl: '',
        wall: 'south',
        positionX: 0,
        positionY: 1.5,
        width: 1.8,
        height: 2.4,
      },
    ],
  };

  halls.set(hall1Id, hall1);
  halls.set(hall2Id, hall2);
}

if (!loadData()) {
  seedData();
}

app.listen(PORT, () => {
  console.log(`Virtual Gallery server running on http://localhost:${PORT}`);
});
