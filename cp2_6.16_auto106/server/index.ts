import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  createdAt: string;
}

interface FlavorRating {
  spicy: number;
  sweet: number;
  salty: number;
  sour: number;
  umami: number;
}

interface DishRecord {
  id: string;
  name: string;
  ingredients: string[];
  textureTags: string[];
  rating: number;
  note: string;
  flavor: FlavorRating;
  createdAt: string;
}

interface Database {
  user: UserProfile;
  records: DishRecord[];
}

const defaultDb: Database = {
  user: {
    id: uuidv4(),
    nickname: '美食探索者',
    avatar: '',
    createdAt: new Date().toISOString(),
  },
  records: [],
};

function readDb(): Database {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
      return defaultDb;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultDb;
  }
}

function writeDb(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/records', (_req, res) => {
  const start = Date.now();
  const db = readDb();
  const elapsed = Date.now() - start;
  console.log(`GET /api/records took ${elapsed}ms`);
  res.json(db.records.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ));
});

app.post('/api/records', (req, res) => {
  const start = Date.now();
  try {
    const { name, ingredients, textureTags, rating, note, flavor } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '菜品名称不能为空' });
    }
    if (!Array.isArray(ingredients) || ingredients.length > 8) {
      return res.status(400).json({ error: '食材数量无效' });
    }
    if (!Array.isArray(textureTags) || textureTags.length < 1 || textureTags.length > 3) {
      return res.status(400).json({ error: '口感标签数量无效' });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '评分无效' });
    }
    
    const newRecord: DishRecord = {
      id: uuidv4(),
      name: name.trim(),
      ingredients: ingredients.map((i: string) => i.trim()).slice(0, 8),
      textureTags,
      rating,
      note: typeof note === 'string' ? note.slice(0, 200) : '',
      flavor: flavor || {
        spicy: Math.floor(Math.random() * 11),
        sweet: Math.floor(Math.random() * 11),
        salty: Math.floor(Math.random() * 11),
        sour: Math.floor(Math.random() * 11),
        umami: Math.floor(Math.random() * 11),
      },
      createdAt: new Date().toISOString(),
    };
    
    const db = readDb();
    db.records.push(newRecord);
    writeDb(db);
    
    const elapsed = Date.now() - start;
    console.log(`POST /api/records took ${elapsed}ms`);
    res.status(201).json(newRecord);
  } catch (err) {
    console.error('Error creating record:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/user', (_req, res) => {
  const start = Date.now();
  const db = readDb();
  const elapsed = Date.now() - start;
  console.log(`GET /api/user took ${elapsed}ms`);
  res.json(db.user);
});

app.put('/api/user', (req, res) => {
  const start = Date.now();
  try {
    const { nickname, avatar } = req.body;
    const db = readDb();
    
    if (typeof nickname === 'string') {
      db.user.nickname = nickname.slice(0, 10);
    }
    if (typeof avatar === 'string') {
      db.user.avatar = avatar;
    }
    
    writeDb(db);
    const elapsed = Date.now() - start;
    console.log(`PUT /api/user took ${elapsed}ms`);
    res.json(db.user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`Flavor Journal API server running on http://localhost:${PORT}`);
  readDb();
});
