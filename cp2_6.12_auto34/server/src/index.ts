import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
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

interface DBTheme {
  id: string;
  name: string;
  keywords: string;
  atmosphere: string;
  palette: string;
  created_at: number;
}

interface DBSketch {
  id: string;
  image_data: string;
  theme_id: string;
  created_at: number;
}

interface Database {
  themes: Record<string, DBTheme>;
  sketches: DBSketch[];
}

const dbPath = path.join(dbDir, 'storage.json');

const loadDB = (): Database => {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('读取存储文件失败，使用空数据库:', (e as Error).message);
  }
  return { themes: {}, sketches: [] };
};

const saveDB = (db: Database): void => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存存储文件失败:', (e as Error).message);
  }
};

let memoryDB: Database = loadDB();

const themeTemplates = [
  {
    name: '迷途森林',
    keywords: ['古老', '神秘', '绿色', '雾气'],
    atmosphere: '浓雾笼罩的古老森林，参天古木虬结，光透过枝叶洒下斑驳光影',
    palette: ['#2d5016', '#a3b18a', '#f5f5dc', '#8b7355'],
  },
  {
    name: '深海梦境',
    keywords: ['蔚蓝', '幽静', '珊瑚', '光迹'],
    atmosphere: '深蓝海水中漂浮着发光的水母，珊瑚礁散发柔和光芒，鱼群如星河流动',
    palette: ['#001f3f', '#0074b7', '#7fdbff', '#ffd166'],
  },
  {
    name: '赛博夜城',
    keywords: ['霓虹', '未来', '雨夜', '高楼'],
    atmosphere: '未来都市的雨夜，霓虹广告牌倒映在湿漉漉的街道，飞行器划过天际',
    palette: ['#0d0221', '#f72585', '#4cc9f0', '#ffbe0b'],
  },
  {
    name: '樱落庭院',
    keywords: ['粉色', '和风', '飘落', '静谧'],
    atmosphere: '古老日式庭院中樱花纷飞，石灯笼静立，水面映着落花瓣',
    palette: ['#ffc0cb', '#ff69b4', '#c71585', '#fff0f5'],
  },
  {
    name: '星际孤旅',
    keywords: ['宇宙', '孤寂', '星云', '飞船'],
    atmosphere: '孤独的飞船穿梭于绚烂星云间，远处恒星散发着温暖光芒',
    palette: ['#1a1a2e', '#16213e', '#e94560', '#f39c12'],
  },
  {
    name: '山居秋暝',
    keywords: ['金黄', '山居', '炊烟', '归鸟'],
    atmosphere: '秋日黄昏的山间村落，屋顶炊烟袅袅，归鸟掠过金色稻田',
    palette: ['#d4a373', '#ccd5ae', '#faedcd', '#e76f51'],
  },
  {
    name: '冰封王座',
    keywords: ['冰雪', '寒冷', '极光', '城堡'],
    atmosphere: '极光下的冰雪城堡，冰晶折射出七彩光芒，寒风卷着雪花呼啸',
    palette: ['#a8dadc', '#457b9d', '#1d3557', '#f1faee'],
  },
  {
    name: '旧梦书店',
    keywords: ['复古', '书香', '暖黄', '木色'],
    atmosphere: '午后阳光穿过积尘的窗户，照亮堆满古书的书架，空气中弥漫着咖啡香',
    palette: ['#6f4e37', '#d4a574', '#f4e4bc', '#8b4513'],
  },
  {
    name: '龙脊梯田',
    keywords: ['青绿', '层叠', '山水', '农耕'],
    atmosphere: '云雾缭绕的层层梯田，从山脚盘绕至山顶，倒映着天空的色彩',
    palette: ['#2d6a4f', '#52b788', '#d8f3dc', '#b7e4c7'],
  },
  {
    name: '暮光市集',
    keywords: ['黄昏', '喧嚣', '灯笼', '异域'],
    atmosphere: '暮色中的异域市集，彩色灯笼次第亮起，商贩吆喝着奇珍异宝',
    palette: ['#3c096c', '#7b2cbf', '#e0aaff', '#ffb703'],
  },
];

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
  if (memoryDB.sketches.length > MAX_SKETCHES) {
    const excess = memoryDB.sketches.length - MAX_SKETCHES;
    memoryDB.sketches.sort((a, b) => a.created_at - b.created_at);
    const removed = memoryDB.sketches.splice(0, excess);
    const usedThemeIds = new Set(memoryDB.sketches.map(s => s.theme_id));
    for (const sketch of removed) {
      if (!usedThemeIds.has(sketch.theme_id)) {
        delete memoryDB.themes[sketch.theme_id];
      }
    }
    saveDB(memoryDB);
  }
}

app.get('/api/theme', (_req, res) => {
  const template = themeTemplates[Math.floor(Math.random() * themeTemplates.length)];
  const theme: Theme = {
    id: uuidv4(),
    name: template.name,
    keywords: [...template.keywords].sort(() => Math.random() - 0.5),
    atmosphere: template.atmosphere,
    palette: [...template.palette].sort(() => Math.random() - 0.5),
    created_at: Date.now(),
  };

  if (!memoryDB.themes[theme.id]) {
    memoryDB.themes[theme.id] = {
      id: theme.id,
      name: theme.name,
      keywords: JSON.stringify(theme.keywords),
      atmosphere: theme.atmosphere,
      palette: JSON.stringify(theme.palette),
      created_at: theme.created_at,
    };
    saveDB(memoryDB);
  }

  res.json(theme);
});

app.post('/api/sketch', (req, res) => {
  try {
    const { image_data, theme_id } = req.body;
    if (!image_data || !theme_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (!memoryDB.themes[theme_id]) {
      return res.status(404).json({ success: false, error: '主题不存在' });
    }

    const sketchId = uuidv4();
    const createdAt = Date.now();

    memoryDB.sketches.push({
      id: sketchId,
      image_data,
      theme_id,
      created_at: createdAt,
    });

    cleanupOldSketches();
    saveDB(memoryDB);

    res.json({ success: true, id: sketchId, created_at: createdAt });
  } catch (error) {
    console.error('保存草图出错:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

app.get('/api/sketches', (_req, res) => {
  try {
    const sorted = [...memoryDB.sketches]
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, MAX_SKETCHES);

    const result = sorted
      .filter((s) => memoryDB.themes[s.theme_id])
      .map((row) => {
        const t = memoryDB.themes[row.theme_id];
        return {
          id: row.id,
          image_data: row.image_data,
          created_at: row.created_at,
          theme: {
            id: t.id,
            name: t.name,
            keywords: JSON.parse(t.keywords) as string[],
            atmosphere: t.atmosphere,
            palette: JSON.parse(t.palette) as string[],
          },
        };
      });

    res.json(result);
  } catch (error) {
    console.error('获取草图列表出错:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
