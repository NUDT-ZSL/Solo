import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import initSqlJs, { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import {
  themeNameParts,
  keywordPool,
  atmosphereTemplates,
  paletteGroups,
} from './theme-config';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'sketches.db');

let db: Database;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DELAY_MS = 2000;

const flushDB = () => {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('保存数据库失败:', (e as Error).message);
  }
};

const scheduleSave = () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    flushDB();
    saveTimer = null;
  }, SAVE_DELAY_MS);
};

const immediateSave = () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  flushDB();
};

const initDB = async () => {
  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(__dirname, '../../node_modules/sql.js/dist', file),
  });

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      keywords TEXT NOT NULL,
      atmosphere TEXT NOT NULL,
      palette TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sketches (
      id TEXT PRIMARY KEY,
      image_data TEXT NOT NULL,
      theme_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (theme_id) REFERENCES themes(id)
    );
  `);

  immediateSave();
};

function pickRandom<T>(arr: T[], min: number, max: number): T[] {
  const result: T[] = [];
  const used = new Set<number>();
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  while (result.length < count && used.size < arr.length) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!used.has(idx)) {
      used.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateThemeName(): string {
  const p = pickOne(themeNameParts.prefix);
  const s = pickOne(themeNameParts.suffix);
  return p + s;
}

function generateAtmosphere(): string {
  const t = atmosphereTemplates;
  const noun = pickOne(t.noun);
  const verb = pickOne(t.verb);
  const adj = pickOne(t.adj);
  const detail = pickOne(t.detail);
  const structure = pickOne(t.structures);
  return structure
    .replace('{adj}', adj)
    .replace('{noun}', noun)
    .replace('{verb}', verb)
    .replace('{detail}', detail);
}

function generatePalette(): string[] {
  const basePalette = pickOne(paletteGroups);
  return [...basePalette].sort(() => Math.random() - 0.5);
}

interface Theme {
  id: string;
  name: string;
  keywords: string[];
  atmosphere: string;
  palette: string[];
  created_at: number;
}

const MAX_SKETCHES = 50;

function cleanupOldSketches(): void {
  try {
    const countRow = db.exec('SELECT COUNT(*) as cnt FROM sketches');
    if (countRow.length === 0) return;
    const count = countRow[0].values[0][0] as number;

    if (count > MAX_SKETCHES) {
      const excess = count - MAX_SKETCHES;

      db.run(
        `DELETE FROM sketches WHERE id IN (
          SELECT id FROM sketches ORDER BY created_at ASC LIMIT ${excess}
        )`
      );

      db.run(
        `DELETE FROM themes WHERE id NOT IN (
          SELECT DISTINCT theme_id FROM sketches
        )`
      );

      scheduleSave();
    }
  } catch (e) {
    console.error('清理旧记录出错:', (e as Error).message);
  }
}

app.get('/api/theme', (_req, res) => {
  const theme: Theme = {
    id: uuidv4(),
    name: generateThemeName(),
    keywords: pickRandom(keywordPool, 3, 5),
    atmosphere: generateAtmosphere(),
    palette: generatePalette(),
    created_at: Date.now(),
  };

  try {
    const stmt = db.prepare(
      'INSERT INTO themes (id, name, keywords, atmosphere, palette, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run([
      theme.id,
      theme.name,
      JSON.stringify(theme.keywords),
      theme.atmosphere,
      JSON.stringify(theme.palette),
      theme.created_at,
    ]);
    scheduleSave();
  } catch (e) {
    console.error('插入主题失败:', (e as Error).message);
  }

  res.json(theme);
});

app.post('/api/sketch', (req, res) => {
  try {
    const { image_data, theme_id } = req.body;
    if (!image_data || !theme_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const themeCheck = db.exec(
      `SELECT id FROM themes WHERE id = '${theme_id}'`
    );
    if (themeCheck.length === 0 || themeCheck[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '主题不存在' });
    }

    const sketchId = uuidv4();
    const createdAt = Date.now();

    const stmt = db.prepare(
      'INSERT INTO sketches (id, image_data, theme_id, created_at) VALUES (?, ?, ?, ?)'
    );
    stmt.run([sketchId, image_data, theme_id, createdAt]);

    cleanupOldSketches();

    immediateSave();

    res.json({ success: true, id: sketchId, created_at: createdAt });
  } catch (error) {
    console.error('保存草图出错:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

app.get('/api/sketches', (_req, res) => {
  try {
    cleanupOldSketches();

    const rows = db.exec(
      `SELECT 
        s.id as sketch_id, 
        s.image_data, 
        s.created_at as sketch_created_at,
        t.id as theme_id,
        t.name as theme_name,
        t.keywords,
        t.atmosphere,
        t.palette
       FROM sketches s 
       INNER JOIN themes t ON s.theme_id = t.id 
       ORDER BY s.created_at DESC 
       LIMIT ${MAX_SKETCHES}`
    );

    const result: Array<{
      id: string;
      image_data: string;
      created_at: number;
      theme: Theme;
    }> = [];

    if (rows.length > 0) {
      for (const row of rows[0].values) {
        result.push({
          id: row[0] as string,
          image_data: row[1] as string,
          created_at: row[2] as number,
          theme: {
            id: row[3] as string,
            name: row[4] as string,
            keywords: JSON.parse(row[5] as string),
            atmosphere: row[6] as string,
            palette: JSON.parse(row[7] as string),
            created_at: 0,
          },
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error('获取草图列表出错:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
