import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new Database(join(__dirname, 'database.db'));

db.exec(`CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  skinColor TEXT NOT NULL,
  clothingColor TEXT NOT NULL,
  hairstyle INTEGER NOT NULL,
  eyeStyle INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE IF NOT EXISTS animations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  emotion TEXT UNIQUE NOT NULL,
  duration INTEGER NOT NULL,
  keyframes TEXT NOT NULL
)`);

const presetAnimations = [
  {
    name: '开心',
    emotion: 'happy',
    duration: 2500,
    keyframes: JSON.stringify([
      { time: 0, headY: 0, eyeScale: 1, bodyRotate: 0, backgroundColor: '#ffe066' },
      { time: 0.25, headY: -8, eyeScale: 1.2, bodyRotate: 2, backgroundColor: '#ffd43b' },
      { time: 0.5, headY: 0, eyeScale: 1, bodyRotate: 0, backgroundColor: '#ffe066' },
      { time: 0.75, headY: -8, eyeScale: 1.2, bodyRotate: -2, backgroundColor: '#ffd43b' },
      { time: 1, headY: 0, eyeScale: 1, bodyRotate: 0, backgroundColor: '#ffe066' }
    ])
  },
  {
    name: '悲伤',
    emotion: 'sad',
    duration: 3000,
    keyframes: JSON.stringify([
      { time: 0, headY: 0, eyeScale: 0.8, bodyRotate: 0, backgroundColor: '#74c0fc' },
      { time: 0.3, headY: 5, eyeScale: 0.7, bodyRotate: -1, backgroundColor: '#4dabf7' },
      { time: 0.6, headY: 8, eyeScale: 0.6, bodyRotate: 0, backgroundColor: '#339af0' },
      { time: 1, headY: 0, eyeScale: 0.8, bodyRotate: 0, backgroundColor: '#74c0fc' }
    ])
  },
  {
    name: '愤怒',
    emotion: 'angry',
    duration: 2000,
    keyframes: JSON.stringify([
      { time: 0, headY: 0, eyeScale: 1.3, bodyRotate: 0, backgroundColor: '#ff6b6b' },
      { time: 0.2, headY: -5, eyeScale: 1.5, bodyRotate: 3, backgroundColor: '#fa5252' },
      { time: 0.4, headY: 0, eyeScale: 1.3, bodyRotate: -3, backgroundColor: '#f03e3e' },
      { time: 0.6, headY: -5, eyeScale: 1.5, bodyRotate: 3, backgroundColor: '#fa5252' },
      { time: 1, headY: 0, eyeScale: 1.3, bodyRotate: 0, backgroundColor: '#ff6b6b' }
    ])
  },
  {
    name: '惊讶',
    emotion: 'surprised',
    duration: 2000,
    keyframes: JSON.stringify([
      { time: 0, headY: 0, eyeScale: 1, bodyRotate: 0, backgroundColor: '#b197fc' },
      { time: 0.1, headY: -12, eyeScale: 1.8, bodyRotate: 0, backgroundColor: '#9775fa' },
      { time: 0.3, headY: -8, eyeScale: 1.6, bodyRotate: 0, backgroundColor: '#845ef7' },
      { time: 0.6, headY: -4, eyeScale: 1.4, bodyRotate: 0, backgroundColor: '#9775fa' },
      { time: 1, headY: 0, eyeScale: 1, bodyRotate: 0, backgroundColor: '#b197fc' }
    ])
  },
  {
    name: '恐惧',
    emotion: 'scared',
    duration: 2500,
    keyframes: JSON.stringify([
      { time: 0, headY: 0, eyeScale: 1.4, bodyRotate: 0, backgroundColor: '#63e6be' },
      { time: 0.2, headY: 3, eyeScale: 1.6, bodyRotate: -2, backgroundColor: '#38d9a9' },
      { time: 0.4, headY: -3, eyeScale: 1.5, bodyRotate: 2, backgroundColor: '#20c997' },
      { time: 0.6, headY: 3, eyeScale: 1.6, bodyRotate: -2, backgroundColor: '#38d9a9' },
      { time: 1, headY: 0, eyeScale: 1.4, bodyRotate: 0, backgroundColor: '#63e6be' }
    ])
  },
  {
    name: '无聊',
    emotion: 'bored',
    duration: 3000,
    keyframes: JSON.stringify([
      { time: 0, headY: 0, eyeScale: 0.5, bodyRotate: 0, backgroundColor: '#adb5bd' },
      { time: 0.5, headY: 10, eyeScale: 0.4, bodyRotate: 1, backgroundColor: '#868e96' },
      { time: 1, headY: 0, eyeScale: 0.5, bodyRotate: 0, backgroundColor: '#adb5bd' }
    ])
  }
];

const countRow = db.prepare('SELECT COUNT(*) as count FROM animations').get();
if (countRow.count === 0) {
  const insertStmt = db.prepare(
    'INSERT INTO animations (name, emotion, duration, keyframes) VALUES (?, ?, ?, ?)'
  );
  const transaction = db.transaction((anims => {
    for (const anim of anims) {
      insertStmt.run(anim.name, anim.emotion, anim.duration, anim.keyframes);
    }
  });
  transaction(presetAnimations);
  console.log('预设动画序列已初始化');
}

app.get('/api/characters', (_, res) => {
  try {
    const rows = db.prepare('SELECT * FROM characters ORDER BY createdAt DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/characters/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!row) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/characters', (req, res) => {
  try {
    const { name, skinColor, clothingColor, hairstyle, eyeStyle } = req.body;
    const stmt = db.prepare(
      'INSERT INTO characters (name, skinColor, clothingColor, hairstyle, eyeStyle) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(name, skinColor, clothingColor, hairstyle, eyeStyle);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/characters/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, skinColor, clothingColor, hairstyle, eyeStyle } = req.body;
    const stmt = db.prepare(
      'UPDATE characters SET name = ?, skinColor = ?, clothingColor = ?, hairstyle = ?, eyeStyle = ? WHERE id = ?'
    );
    const result = stmt.run(name, skinColor, clothingColor, hairstyle, eyeStyle, id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/characters/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = db.prepare('DELETE FROM characters WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/animations', (_, res) => {
  try {
    const rows = db.prepare('SELECT * FROM animations').all();
    const result = rows.map(row => ({
      ...row,
      keyframes: JSON.parse(row.keyframes)
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
