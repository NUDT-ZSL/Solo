import express from 'express';
import initSqlJs from 'sql.js';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let db: any;
let SQL: any;

interface Gallery {
  id: number;
  name: string;
  description: string;
  theme: string;
}

interface Exhibit {
  id: number;
  gallery_id: number;
  name: string;
  description: string;
  model_type: string;
  color: string;
  category: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
}

const dbPath = join(__dirname, 'museum.db');

const saveDatabase = () => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFile(dbPath, buffer);
};

const initDatabase = async () => {
  SQL = await initSqlJs();

  let filebuffer: Uint8Array | null = null;
  if (existsSync(dbPath)) {
    filebuffer = await fs.readFile(dbPath);
  }

  db = new SQL.Database(filebuffer || undefined);

  db.run(`CREATE TABLE IF NOT EXISTS galleries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    theme TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS exhibits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gallery_id INTEGER,
    name TEXT,
    description TEXT,
    model_type TEXT,
    color TEXT,
    category TEXT,
    pos_x REAL,
    pos_y REAL,
    pos_z REAL,
    FOREIGN KEY (gallery_id) REFERENCES galleries(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    event_data TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const result = db.exec('SELECT COUNT(*) as count FROM galleries');
  const count = result[0].values[0][0];
  if (count === 0) {
    insertSeedData();
  }
};

const insertSeedData = () => {
  const galleries = [
    { name: '现代艺术馆', description: '展示当代艺术作品', theme: 'contemporary' },
    { name: '古典雕塑馆', description: '展示经典雕塑作品', theme: 'classical' },
    { name: '数字媒体馆', description: '展示数字媒体艺术', theme: 'digital' }
  ];

  const categories = ['sculpture', 'painting', 'installation'];
  const modelTypes = ['sphere', 'torus'];
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

  const galleryNames = ['现代艺术', '古典雕塑', '数字媒体'];
  const exhibitNames = [
    '无题', '永恒', '流动', '静谧', '光影', '记忆', '梦境', '时空', '轨迹', '回响'
  ];

  const insertGallery = db.prepare('INSERT INTO galleries (name, description, theme) VALUES (?, ?, ?)');
  const insertExhibit = db.prepare(
    'INSERT INTO exhibits (gallery_id, name, description, model_type, color, category, pos_x, pos_y, pos_z) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

  galleries.forEach((gallery, galleryIndex) => {
    insertGallery.run([gallery.name, gallery.description, gallery.theme]);
    const galleryId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];

    for (let i = 0; i < 10; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const modelType = modelTypes[Math.floor(Math.random() * modelTypes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const row = Math.floor(i / 5);
      const col = i % 5;
      const posX = -8 + col * 4;
      const posY = 0;
      const posZ = -4 + row * 8;

      insertExhibit.run([
        galleryId,
        `${galleryNames[galleryIndex]}${exhibitNames[i]}`,
        `${galleryNames[galleryIndex]}展品${i + 1}的详细描述`,
        modelType,
        color,
        category,
        posX,
        posY,
        posZ
      ]);
    }
  });

  saveDatabase();
};

app.get('/api/galleries', (req, res) => {
  try {
    const result = db.exec('SELECT * FROM galleries');
    if (result.length === 0) {
      res.json([]);
      return;
    }
    const columns = result[0].columns;
    const rows = result[0].values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, idx: number) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/galleries/:id', (req, res) => {
  try {
    const { id } = req.params;
    const galleryResult = db.exec('SELECT * FROM galleries WHERE id = ?', [id]);

    if (galleryResult.length === 0 || galleryResult[0].values.length === 0) {
      res.status(404).json({ error: 'Gallery not found' });
      return;
    }

    const galleryColumns = galleryResult[0].columns;
    const galleryValues = galleryResult[0].values[0];
    const gallery: any = {};
    galleryColumns.forEach((col: string, idx: number) => {
      gallery[col] = galleryValues[idx];
    });

    const exhibitsResult = db.exec('SELECT * FROM exhibits WHERE gallery_id = ?', [id]);
    let exhibits: any[] = [];
    if (exhibitsResult.length > 0) {
      const exhibitsColumns = exhibitsResult[0].columns;
      exhibits = exhibitsResult[0].values.map((row: any[]) => {
        const obj: any = {};
        exhibitsColumns.forEach((col: string, idx: number) => {
          obj[col] = row[idx];
        });
        return obj;
      });
    }

    res.json({ gallery, exhibits });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', (req, res) => {
  try {
    const { type, data, timestamp } = req.body;
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data || {});
    const ts = timestamp || new Date().toISOString();

    const stmt = db.prepare('INSERT INTO user_logs (event_type, event_data, timestamp) VALUES (?, ?, ?)');
    stmt.run([type, dataStr, ts]);
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];

    saveDatabase();

    res.json({ id, type, data: dataStr, timestamp: ts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

export default app;
