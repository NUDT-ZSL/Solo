import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    pet_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    species TEXT NOT NULL CHECK(species IN ('cat', 'dog', 'rabbit')),
    hunger INTEGER DEFAULT 80 CHECK(hunger >= 0 AND hunger <= 100),
    cleanliness INTEGER DEFAULT 80 CHECK(cleanliness >= 0 AND cleanliness <= 100),
    happiness INTEGER DEFAULT 80 CHECK(happiness >= 0 AND happiness <= 100),
    health INTEGER DEFAULT 80 CHECK(health >= 0 AND health <= 100),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS diaries (
    id TEXT PRIMARY KEY,
    pet_id TEXT NOT NULL,
    content TEXT NOT NULL CHECK(length(content) <= 300),
    mood TEXT NOT NULL CHECK(mood IN ('happy', 'normal', 'angry', 'sad')),
    date TEXT NOT NULL,
    silhouette_data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (pet_id) REFERENCES pets(id)
  );
`);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ==================== 用户 API ====================
app.post('/api/users/register', (req, res) => {
  const { username } = req.body as { username: string };
  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: '用户名不能为空' });
  }
  const name = username.trim();
  const exist = db.prepare('SELECT id FROM users WHERE username = ?').get(name) as any;
  if (exist) {
    const userPet = db.prepare('SELECT pet_id FROM users WHERE id = ?').get(exist.id) as any;
    return res.json({ userId: exist.id, username: name, petId: userPet?.pet_id || null });
  }
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(id, name);
  res.json({ userId: id, username: name, petId: null });
});

app.get('/api/users/:userId', (req, res) => {
  const row = db.prepare('SELECT id, username, pet_id FROM users WHERE id = ?').get(req.params.userId) as any;
  if (!row) return res.status(404).json({ error: '用户不存在' });
  res.json({ userId: row.id, username: row.username, petId: row.pet_id });
});

// ==================== 宠物 API ====================
app.post('/api/pets/adopt', (req, res) => {
  const { userId, species } = req.body as { userId: string; species: 'cat' | 'dog' | 'rabbit' };
  if (!['cat', 'dog', 'rabbit'].includes(species)) {
    return res.status(400).json({ error: '无效的宠物品种' });
  }
  const user = db.prepare('SELECT id, pet_id FROM users WHERE id = ?').get(userId) as any;
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.pet_id) {
    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(user.pet_id) as any;
    return res.json(petToResp(pet));
  }
  const petId = uuidv4();
  db.prepare(
    `INSERT INTO pets (id, user_id, species, hunger, cleanliness, happiness, health)
     VALUES (?, ?, ?, 80, 80, 80, 80)`
  ).run(petId, userId, species);
  db.prepare('UPDATE users SET pet_id = ? WHERE id = ?').run(petId, userId);
  const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(petId) as any;
  res.json(petToResp(pet));
});

function petToResp(pet: any) {
  return {
    petId: pet.id,
    userId: pet.user_id,
    species: pet.species,
    hunger: pet.hunger,
    cleanliness: pet.cleanliness,
    happiness: pet.happiness,
    health: pet.health,
    createdAt: pet.created_at,
  };
}

app.get('/api/pets/:petId', (req, res) => {
  const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.petId) as any;
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  res.json(petToResp(pet));
});

app.post('/api/pets/:petId/action', (req, res) => {
  const { action } = req.body as { action: 'feed' | 'bath' | 'play' };
  const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.petId) as any;
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  let { hunger, cleanliness, happiness, health } = pet;
  if (action === 'feed') {
    hunger = clamp(hunger + 10, 0, 100);
    happiness = clamp(happiness + 3, 0, 100);
    health = clamp(health + 1, 0, 100);
  } else if (action === 'bath') {
    cleanliness = clamp(cleanliness + 10, 0, 100);
    happiness = clamp(happiness + 2, 0, 100);
    health = clamp(health + 1, 0, 100);
  } else if (action === 'play') {
    happiness = clamp(happiness + 10, 0, 100);
    hunger = clamp(hunger - 3, 0, 100);
    cleanliness = clamp(cleanliness - 2, 0, 100);
    health = clamp(health + 2, 0, 100);
  } else {
    return res.status(400).json({ error: '无效的动作' });
  }
  db.prepare(
    `UPDATE pets SET hunger = ?, cleanliness = ?, happiness = ?, health = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(hunger, cleanliness, happiness, health, req.params.petId);
  res.json({ hunger, cleanliness, happiness, health });
});

app.post('/api/pets/:petId/decay', (req, res) => {
  const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(req.params.petId) as any;
  if (!pet) return res.status(404).json({ error: '宠物不存在' });
  let { hunger, cleanliness, happiness, health } = pet;
  hunger = clamp(hunger - 1, 0, 100);
  cleanliness = clamp(cleanliness - 1, 0, 100);
  happiness = clamp(happiness - 1, 0, 100);
  let hDelta = 0;
  if (hunger < 30 || cleanliness < 30 || happiness < 30) hDelta = -1;
  health = clamp(health + hDelta, 0, 100);
  db.prepare(
    `UPDATE pets SET hunger = ?, cleanliness = ?, happiness = ?, health = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(hunger, cleanliness, happiness, health, req.params.petId);
  res.json({ hunger, cleanliness, happiness, health });
});

// ==================== 日记 API ====================
app.post('/api/diaries', (req, res) => {
  const { petId, content, mood, silhouetteData } = req.body as {
    petId: string;
    content: string;
    mood: 'happy' | 'normal' | 'angry' | 'sad';
    silhouetteData?: string;
  };
  if (!petId || !content || !mood) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  if (content.length > 300) {
    return res.status(400).json({ error: '日记内容超过300字' });
  }
  if (!['happy', 'normal', 'angry', 'sad'].includes(mood)) {
    return res.status(400).json({ error: '无效的心情值' });
  }
  const date = todayStr();
  const existing = db.prepare('SELECT id FROM diaries WHERE pet_id = ? AND date = ?').get(petId, date) as any;
  if (existing) {
    db.prepare(
      'UPDATE diaries SET content = ?, mood = ?, silhouette_data = COALESCE(?, silhouette_data) WHERE id = ?'
    ).run(content, mood, silhouetteData || null, existing.id);
    const diary = db.prepare('SELECT * FROM diaries WHERE id = ?').get(existing.id) as any;
    return res.json(diaryToResp(diary));
  }
  const id = uuidv4();
  db.prepare(
    `INSERT INTO diaries (id, pet_id, content, mood, date, silhouette_data)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, petId, content, mood, date, silhouetteData || null);
  const diary = db.prepare('SELECT * FROM diaries WHERE id = ?').get(id) as any;
  res.json(diaryToResp(diary));
});

app.get('/api/diaries', (req, res) => {
  const petId = req.query.petId as string;
  if (!petId) return res.status(400).json({ error: '缺少petId参数' });
  const rows = db.prepare(
    'SELECT * FROM diaries WHERE pet_id = ? ORDER BY date DESC, created_at DESC'
  ).all(petId) as any[];
  res.json({ diaries: rows.map(diaryToResp) });
});

app.get('/api/diaries/:diaryId', (req, res) => {
  const d = db.prepare('SELECT * FROM diaries WHERE id = ?').get(req.params.diaryId) as any;
  if (!d) return res.status(404).json({ error: '日记不存在' });
  res.json(diaryToResp(d));
});

function diaryToResp(d: any) {
  return {
    diaryId: d.id,
    petId: d.pet_id,
    content: d.content,
    mood: d.mood,
    date: d.date,
    silhouetteData: d.silhouette_data,
    createdAt: d.created_at,
  };
}

app.listen(PORT, () => {
  console.log(`[PetServer] 后端运行在 http://localhost:${PORT}`);
});
