import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const DB_FILE = join(__dirname, 'database.db');

app.use(cors());
app.use(express.json());

let db;

const initDatabase = async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
    console.log('SQLite数据库已加载');
  } else {
    db = new SQL.Database();
    console.log('新SQLite数据库已创建');
  }

  db.run(`CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    skinColor TEXT NOT NULL,
    clothingColor TEXT NOT NULL,
    hairstyle INTEGER NOT NULL,
    eyeStyle INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS animations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emotion TEXT UNIQUE NOT NULL,
    duration INTEGER NOT NULL,
    keyframes TEXT NOT NULL
  )`);

  const result = db.exec('SELECT COUNT(*) as count FROM animations');
  const count = result[0]?.values[0]?.[0] || 0;

  if (count === 0) {
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

    const stmt = db.prepare(
      'INSERT INTO animations (name, emotion, duration, keyframes) VALUES (?, ?, ?, ?)'
    );
    presetAnimations.forEach(anim => {
      stmt.run([anim.name, anim.emotion, anim.duration, anim.keyframes]);
    });
    stmt.free();
    console.log('预设动画序列已初始化');
  }

  saveDatabase();
};

const saveDatabase = () => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
};

const rowsToObjects = (result) => {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
};

app.get('/api/characters', (_, res) => {
  try {
    const result = db.exec('SELECT * FROM characters ORDER BY createdAt DESC');
    const characters = rowsToObjects(result);
    res.json(characters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/characters/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const stmt = db.prepare('SELECT * FROM characters WHERE id = ?');
    const result = stmt.getAsObject([id]);
    stmt.free();
    if (!result || !result.id) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    res.json(result);
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
    stmt.run([name, skinColor, clothingColor, hairstyle, eyeStyle]);
    const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    stmt.free();
    saveDatabase();
    res.json({ id });
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
    stmt.run([name, skinColor, clothingColor, hairstyle, eyeStyle, id]);
    const changes = db.getRowsModified();
    stmt.free();
    if (changes === 0) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    saveDatabase();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/characters/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const stmt = db.prepare('DELETE FROM characters WHERE id = ?');
    stmt.run([id]);
    const changes = db.getRowsModified();
    stmt.free();
    if (changes === 0) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    saveDatabase();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/animations', (_, res) => {
  try {
    const result = db.exec('SELECT * FROM animations');
    const animations = rowsToObjects(result).map(row => ({
      ...row,
      keyframes: JSON.parse(row.keyframes)
    }));
    res.json(animations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`后端服务器运行在 http://localhost:${PORT}`);
    console.log(`SQLite数据库文件: ${DB_FILE}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});
