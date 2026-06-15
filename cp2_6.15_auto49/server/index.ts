import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

interface AnnotationRow {
  id: number;
  x: number;
  y: number;
  z: number;
  text: string;
  lithology: string;
  created_at: string;
}

let db: Database;

const DB_PATH = path.join(__dirname, 'stratum.db');

async function initDB() {
  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
  });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      text TEXT NOT NULL,
      lithology TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  saveDB();
}

function saveDB() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('保存数据库失败:', err);
  }
}

app.get('/api/annotations', (_req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM annotations ORDER BY created_at DESC');
    const rows: AnnotationRow[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as AnnotationRow;
      rows.push(row);
    }
    stmt.free();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/annotations', (req, res) => {
  try {
    const { x, y, z, text, lithology } = req.body;
    if (x === undefined || y === undefined || z === undefined || !text || !lithology) {
      return res.status(400).json({ error: '缺少必要字段' });
    }
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO annotations (x, y, z, text, lithology, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [x, y, z, text, lithology, now]
    );
    const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
    saveDB();

    const stmt = db.prepare('SELECT * FROM annotations WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    const row = stmt.getAsObject() as unknown as AnnotationRow;
    stmt.free();

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/annotations/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: '无效的ID' });
    }
    const before = db.exec('SELECT changes() as c')[0].values[0][0];
    db.run('DELETE FROM annotations WHERE id = ?', [id]);
    const changesStmt = db.prepare('SELECT changes() as c');
    changesStmt.step();
    const changes = changesStmt.getAsObject() as { c: number };
    changesStmt.free();

    if (changes.c === 0) {
      return res.status(404).json({ error: '标注不存在' });
    }
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/lithology/:x/:y/:z', (req, res) => {
  try {
    const x = parseFloat(req.params.x);
    const y = parseFloat(req.params.y);
    const z = parseFloat(req.params.z);
    const lithologies = ['砂岩', '页岩', '石灰岩', '花岗岩', '泥岩', '白云岩', '玄武岩', '片麻岩'];
    const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1;
    const idx = Math.floor(hash * lithologies.length);
    res.json({
      x: parseFloat(x.toFixed(1)),
      y: parseFloat(y.toFixed(1)),
      z: parseFloat(z.toFixed(1)),
      lithology: lithologies[idx],
      confidence: parseFloat((0.7 + hash * 0.3).toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

interface CrossSectionData {
  axis: 'x' | 'z';
  position: number;
  layers: Array<{
    yTop: number;
    yBottom: number;
    lithology: string;
    color: string;
  }>;
}

function generateCrossSection(axis: 'x' | 'z', position: number): CrossSectionData {
  const lithologies = ['砂岩', '页岩', '石灰岩', '花岗岩', '泥岩'];
  const colors = ['#5d4037', '#6d4c41', '#795548', '#8d6e63', '#a1887f', '#bcaaa4'];
  const layers: CrossSectionData['layers'] = [];
  let currentY = -50;
  for (let i = 0; i < 10; i++) {
    const thickness = 5 + ((Math.sin(position * 0.1 + i * 2.5) + 1) * 5);
    const yBottom = currentY - thickness;
    const hash = Math.abs(Math.sin(position * 3.14 + i * 17.8) * 1000) % 1;
    layers.push({
      yTop: currentY,
      yBottom,
      lithology: lithologies[Math.floor(hash * lithologies.length)],
      color: colors[i % colors.length],
    });
    currentY = yBottom;
  }
  return { axis, position, layers };
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'request_cross_section') {
        const { axis, position } = msg;
        const result = generateCrossSection(axis, position);
        ws.send(JSON.stringify({ type: 'cross_section', data: result }));
      }
    } catch {}
  });
});

const PORT = process.env.PORT || 3001;

initDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });
