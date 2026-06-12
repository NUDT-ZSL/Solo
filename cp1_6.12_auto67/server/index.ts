import express from 'express';
import Database from 'better-sqlite3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new Database(path.join(__dirname, '..', 'music_memory.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    songName TEXT NOT NULL,
    artist TEXT NOT NULL,
    scene TEXT NOT NULL,
    rating INTEGER DEFAULT 0,
    image TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recordId INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (recordId) REFERENCES records(id) ON DELETE CASCADE
  );
`);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 JPG 和 PNG 格式图片'));
    }
  }
});

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

interface Record {
  id: number;
  songName: string;
  artist: string;
  scene: string;
  rating: number;
  image: string | null;
  createdAt: string;
  tags: string[];
}

app.get('/api/records', (req, res) => {
  try {
    const { tags, rating, timePeriod, search } = req.query;

    let query = `
      SELECT r.*, GROUP_CONCAT(t.tag) as tagList
      FROM records r
      LEFT JOIN tags t ON r.id = t.recordId
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (r.songName LIKE ? OR r.artist LIKE ? OR r.scene LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (rating) {
      query += ` AND r.rating >= ?`;
      params.push(Number(rating));
    }

    if (timePeriod) {
      const now = new Date();
      let startDate: Date;
      switch (timePeriod) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      query += ` AND r.createdAt >= ?`;
      params.push(startDate.toISOString());
    }

    query += ` GROUP BY r.id ORDER BY r.createdAt DESC`;

    const rows = db.prepare(query).all(...params) as any[];

    const records: Record[] = rows.map(row => ({
      id: row.id,
      songName: row.songName,
      artist: row.artist,
      scene: row.scene,
      rating: row.rating,
      image: row.image,
      createdAt: row.createdAt,
      tags: row.tagList ? row.tagList.split(',') : []
    }));

    if (tags) {
      const tagArray = (tags as string).split(',');
      const filtered = records.filter(r =>
        tagArray.some(t => r.tags.includes(t))
      );
      return res.json(filtered);
    }

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '获取记录失败', details: (err as Error).message });
  }
});

app.post('/api/records', upload.single('image'), (req, res) => {
  try {
    const { songName, artist, scene, rating, tags } = req.body;

    if (!songName || !artist || !scene) {
      return res.status(400).json({ error: '歌曲名称、艺术家和情境为必填项' });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const stmt = db.prepare(`
      INSERT INTO records (songName, artist, scene, rating, image)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(songName, artist, scene, rating || 0, imagePath);
    const recordId = result.lastInsertRowid as number;

    let tagList: string[] = [];
    if (tags) {
      try {
        tagList = JSON.parse(tags);
        if (tagList.length > 3) {
          tagList = tagList.slice(0, 3);
        }
        const tagStmt = db.prepare('INSERT INTO tags (recordId, tag) VALUES (?, ?)');
        for (const tag of tagList) {
          tagStmt.run(recordId, tag);
        }
      } catch (e) {
        // ignore tag parse error
      }
    }

    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId) as any;

    res.status(201).json({
      ...record,
      tags: tagList
    });
  } catch (err) {
    res.status(500).json({ error: '创建记录失败', details: (err as Error).message });
  }
});

app.delete('/api/records/:id', (req, res) => {
  try {
    const { id } = req.params;

    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id) as any;
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    if (record.image) {
      const imagePath = path.join(__dirname, '..', record.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    db.prepare('DELETE FROM tags WHERE recordId = ?').run(id);
    db.prepare('DELETE FROM records WHERE id = ?').run(id);

    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除失败', details: (err as Error).message });
  }
});

app.get('/api/scenes', (req, res) => {
  const scenes = [
    { id: 'rainy_night', name: '雨夜', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
    { id: 'road_trip', name: '公路旅行', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'morning_run', name: '晨跑', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { id: 'study', name: '自习', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
  ];
  res.json(scenes);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
