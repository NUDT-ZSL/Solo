import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import initSqlJs, { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

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

  saveDB();
};

const saveDB = () => {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('保存数据库失败:', (e as Error).message);
  }
};

const themeNameParts = [
  { prefix: ['迷途', '深海', '赛博', '樱落', '星际', '山居', '冰封', '旧梦', '龙脊', '暮光', '月下', '云端', '孤岛', '翡翠', '琥珀', '琉璃', '赤焰', '青黛', '碧落', '苍梧'],
    suffix: ['森林', '梦境', '夜城', '庭院', '孤旅', '秋暝', '王座', '书店', '梯田', '市集', '潮汐', '之境', '秘语', '遗迹', '传说', '回响', '长歌', '画卷', '诗笺', '旧痕'] },
];

const keywordPool = [
  '古老', '神秘', '绿色', '雾气', '蔚蓝', '幽静', '珊瑚', '光迹', '霓虹', '未来',
  '雨夜', '高楼', '粉色', '和风', '飘落', '静谧', '宇宙', '孤寂', '星云', '飞船',
  '金黄', '山居', '炊烟', '归鸟', '冰雪', '寒冷', '极光', '城堡', '复古', '书香',
  '暖黄', '木色', '青绿', '层叠', '山水', '农耕', '黄昏', '喧嚣', '灯笼', '异域',
  '晨光', '薄雾', '涟漪', '星轨', '萤火', '苔痕', '竹影', '松涛', '稻香', '蝉鸣',
  '落霞', '孤鹜', '长河', '落日', '古道', '西风', '残阳', '银汉', '玉盘', '清辉',
  '琉璃', '琥珀', '翡翠', '朱砂', '丹青', '水墨', '烟雨', '梨花', '海棠', '丹桂',
];

const atmosphereTemplates = [
  { noun: ['森林', '海洋', '城市', '庭院', '星空', '村落', '雪原', '书店', '山间', '市集', '古道', '云端', '湖畔', '废墟', '阁楼'],
    verb: ['笼罩着', '漂浮着', '倒映着', '散落着', '闪烁着', '弥漫着', '交织着', '萦绕着', '点缀着', '镶嵌着'],
    adj: ['古老的', '神秘的', '幽静的', '绚烂的', '静谧的', '温暖的', '遥远的', '璀璨的', '朦胧的', '寂静的'],
    detail: ['斑驳光影透过枝叶洒落', '发光的生物在深处游弋', '霓虹广告牌闪烁着彩色光芒', '花瓣随风旋转飘落', '流星划过无垠的黑暗', '屋顶升起袅袅炊烟', '冰晶折射七彩光芒', '尘埃在光束中飞舞', '云雾缠绕层叠而上', '灯笼次第亮起'] },
];

const paletteGroups = [
  ['#2d5016', '#a3b18a', '#f5f5dc', '#8b7355'],
  ['#001f3f', '#0074b7', '#7fdbff', '#ffd166'],
  ['#0d0221', '#f72585', '#4cc9f0', '#ffbe0b'],
  ['#ffc0cb', '#ff69b4', '#c71585', '#fff0f5'],
  ['#1a1a2e', '#16213e', '#e94560', '#f39c12'],
  ['#d4a373', '#ccd5ae', '#faedcd', '#e76f51'],
  ['#a8dadc', '#457b9d', '#1d3557', '#f1faee'],
  ['#6f4e37', '#d4a574', '#f4e4bc', '#8b4513'],
  ['#2d6a4f', '#52b788', '#d8f3dc', '#b7e4c7'],
  ['#3c096c', '#7b2cbf', '#e0aaff', '#ffb703'],
  ['#03071e', '#370617', '#6a040f', '#ffba08'],
  ['#caf0f8', '#0077b6', '#023e8a', '#03045e'],
  ['#f8f9fa', '#e9ecef', '#6c757d', '#212529'],
  ['#fff3b0', '#e09f3e', '#9e2a2b', '#540b0e'],
  ['#e0fbfc', '#98c1d9', '#3d5a80', '#293241'],
  ['#ff99c8', '#fcf6bd', '#d0f4de', '#a9def9'],
  ['#ff006e', '#8338ec', '#3a86ff', '#fb5607'],
  ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec'],
  ['#264653', '#2a9d8f', '#e9c46a', '#e76f51'],
  ['#006400', '#228b22', '#9acd32', '#ffff00'],
];

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
  const group = themeNameParts[0];
  const p = pickOne(group.prefix);
  const s = pickOne(group.suffix);
  return p + s;
}

function generateAtmosphere(): string {
  const t = atmosphereTemplates[0];
  const noun = pickOne(t.noun);
  const verb = pickOne(t.verb);
  const adj = pickOne(t.adj);
  const detail = pickOne(t.detail);
  const structures = [
    `${adj}${noun}中，${detail}，空气中${verb}淡淡的诗意。`,
    `${noun}深处${verb}${adj}气息，${detail}，一切仿佛静止。`,
    `当${detail}，${adj}的${noun}便${verb}属于它的独特故事。`,
    `${adj}的${noun}里，${detail}，时光在此刻变得柔软而绵长。`,
    `${detail}的${noun}中，${verb}${adj}氛围，让人不忍离去。`,
    `走进${adj}的${noun}，${detail}，耳边${verb}远古的低语。`,
  ];
  return pickOne(structures);
}

function generatePalette(): string[] {
  const basePalette = pickOne(paletteGroups);
  const shuffled = [...basePalette].sort(() => Math.random() - 0.5);
  return shuffled;
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
      const oldRows = db.exec(
        `SELECT s.id, s.theme_id FROM sketches s 
         ORDER BY s.created_at ASC 
         LIMIT ${excess}`
      );

      if (oldRows.length > 0) {
        const idsToDelete: string[] = [];
        const themeIds: string[] = [];

        for (const row of oldRows[0].values) {
          idsToDelete.push(row[0] as string);
          themeIds.push(row[1] as string);
        }

        const delSketchStmt = db.prepare('DELETE FROM sketches WHERE id = ?');
        for (const id of idsToDelete) {
          delSketchStmt.run([id]);
        }

        const delStmt = db.prepare(
          'DELETE FROM themes WHERE id = ? AND id NOT IN (SELECT theme_id FROM sketches)'
        );
        for (const tid of themeIds) {
          delStmt.run([tid]);
        }

        saveDB();
      }
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
    const existing = db.exec(
      `SELECT id FROM themes WHERE id = '${theme.id}'`
    );
    if (existing.length === 0 || existing[0].values.length === 0) {
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
      saveDB();
    }
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
    saveDB();

    cleanupOldSketches();

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
