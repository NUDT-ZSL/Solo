import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { LevelData, Enemy, TargetItem } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const levelsCache = new Map<string, LevelData>();
const levelsDir = path.join(__dirname, 'data', 'levels');

function generateLevel1(): LevelData {
  const cols = 24;
  const rows = 16;
  const tileSize = 40;
  const tiles: number[][] = [];

  for (let y = 0; y < rows; y++) {
    tiles[y] = [];
    for (let x = 0; x < cols; x++) {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
        tiles[y][x] = 1;
      } else if (
        (x >= 4 && x <= 7 && y >= 3 && y <= 6) ||
        (x >= 14 && x <= 18 && y >= 9 && y <= 12) ||
        (x >= 9 && x <= 12 && y >= 2 && y <= 4) ||
        (x >= 16 && x <= 19 && y >= 3 && y <= 5)
      ) {
        tiles[y][x] = 1;
      } else if (
        (x === 3 && y >= 4 && y <= 5) ||
        (x === 13 && y >= 10 && y <= 11)
      ) {
        tiles[y][x] = 2;
      } else if (
        (x >= 2 && x <= 3 && y >= 11 && y <= 13) ||
        (x >= 19 && x <= 21 && y >= 6 && y <= 7) ||
        (x >= 8 && x <= 10 && y >= 8 && y <= 9)
      ) {
        tiles[y][x] = 3;
      } else {
        tiles[y][x] = 0;
      }
    }
  }

  const enemies: Enemy[] = [
    {
      id: 'guard1',
      type: 'patrol',
      x: 360,
      y: 300,
      pathPoints: [
        { x: 360, y: 300 },
        { x: 360, y: 480 },
        { x: 560, y: 480 },
        { x: 560, y: 300 }
      ],
      visionAngle: 0
    },
    {
      id: 'light1',
      type: 'searchlight',
      x: 120,
      y: 80,
      pathPoints: [],
      visionAngle: Math.PI / 4,
      rotationSpeed: 0.02
    },
    {
      id: 'light2',
      type: 'searchlight',
      x: 840,
      y: 560,
      pathPoints: [],
      visionAngle: Math.PI + Math.PI / 4,
      rotationSpeed: -0.018
    },
    {
      id: 'dog1',
      type: 'dog',
      x: 700,
      y: 200,
      pathPoints: [
        { x: 700, y: 200 },
        { x: 860, y: 200 },
        { x: 860, y: 360 },
        { x: 700, y: 360 }
      ]
    }
  ];

  const targetItems: TargetItem[] = [
    { id: 'item1', x: 200, y: 160, name: '机密文件', stealTime: 1500, stolen: false },
    { id: 'item2', x: 800, y: 280, name: '钻石项链', stealTime: 1500, stolen: false },
    { id: 'item3', x: 440, y: 540, name: '加密硬盘', stealTime: 1500, stolen: false }
  ];

  return {
    id: '1',
    name: '暗夜街巷',
    width: cols * tileSize,
    height: rows * tileSize,
    tileSize,
    tiles,
    enemies,
    targetItems,
    playerSpawn: { x: 80, y: 560 },
    exitPoint: { x: 900, y: 560 }
  };
}

function generateLevel2(): LevelData {
  const cols = 24;
  const rows = 16;
  const tileSize = 40;
  const tiles: number[][] = [];

  for (let y = 0; y < rows; y++) {
    tiles[y] = [];
    for (let x = 0; x < cols; x++) {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
        tiles[y][x] = 1;
      } else if (
        (x >= 3 && x <= 5 && y >= 2 && y <= 5) ||
        (x >= 3 && x <= 5 && y >= 10 && y <= 13) ||
        (x >= 18 && x <= 20 && y >= 2 && y <= 5) ||
        (x >= 18 && x <= 20 && y >= 10 && y <= 13) ||
        (x >= 10 && x <= 13 && y >= 6 && y <= 9)
      ) {
        tiles[y][x] = 1;
      } else if (
        (x === 6 && y >= 3 && y <= 4) ||
        (x === 17 && y >= 11 && y <= 12) ||
        (x === 9 && y >= 7 && y <= 8)
      ) {
        tiles[y][x] = 2;
      } else if (
        (x >= 7 && x <= 9 && y >= 2 && y <= 4) ||
        (x >= 14 && x <= 16 && y >= 11 && y <= 13) ||
        (x >= 2 && x <= 3 && y >= 7 && y <= 8) ||
        (x >= 20 && x <= 21 && y >= 7 && y <= 8)
      ) {
        tiles[y][x] = 3;
      } else {
        tiles[y][x] = 0;
      }
    }
  }

  const enemies: Enemy[] = [
    {
      id: 'guard1',
      type: 'patrol',
      x: 280,
      y: 280,
      pathPoints: [
        { x: 280, y: 280 },
        { x: 280, y: 520 },
        { x: 640, y: 520 },
        { x: 640, y: 280 }
      ]
    },
    {
      id: 'guard2',
      type: 'patrol',
      x: 720,
      y: 160,
      pathPoints: [
        { x: 720, y: 160 },
        { x: 880, y: 160 },
        { x: 880, y: 400 },
        { x: 720, y: 400 }
      ]
    },
    {
      id: 'light1',
      type: 'searchlight',
      x: 80,
      y: 40,
      pathPoints: [],
      visionAngle: Math.PI / 3,
      rotationSpeed: 0.025
    },
    {
      id: 'light2',
      type: 'searchlight',
      x: 880,
      y: 40,
      pathPoints: [],
      visionAngle: Math.PI - Math.PI / 3,
      rotationSpeed: -0.02
    },
    {
      id: 'light3',
      type: 'searchlight',
      x: 480,
      y: 600,
      pathPoints: [],
      visionAngle: -Math.PI / 2,
      rotationSpeed: 0.018
    },
    {
      id: 'dog1',
      type: 'dog',
      x: 320,
      y: 440,
      pathPoints: [
        { x: 320, y: 440 },
        { x: 480, y: 440 }
      ]
    }
  ];

  const targetItems: TargetItem[] = [
    { id: 'item1', x: 160, y: 320, name: '保险箱钥匙', stealTime: 1500, stolen: false },
    { id: 'item2', x: 800, y: 520, name: '货物清单', stealTime: 1500, stolen: false },
    { id: 'item3', x: 440, y: 240, name: '商业机密U盘', stealTime: 1500, stolen: false }
  ];

  return {
    id: '2',
    name: '仓库禁区',
    width: cols * tileSize,
    height: rows * tileSize,
    tileSize,
    tiles,
    enemies,
    targetItems,
    playerSpawn: { x: 60, y: 600 },
    exitPoint: { x: 900, y: 80 }
  };
}

function generateLevel3(): LevelData {
  const cols = 24;
  const rows = 16;
  const tileSize = 40;
  const tiles: number[][] = [];

  for (let y = 0; y < rows; y++) {
    tiles[y] = [];
    for (let x = 0; x < cols; x++) {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
        tiles[y][x] = 1;
      } else if (
        (x >= 2 && x <= 8 && y >= 2 && y <= 4) ||
        (x >= 15 && x <= 21 && y >= 2 && y <= 4) ||
        (x >= 2 && x <= 4 && y >= 8 && y <= 13) ||
        (x >= 19 && x <= 21 && y >= 8 && y <= 13) ||
        (x >= 9 && x <= 14 && y >= 11 && y <= 13) ||
        (x >= 9 && x <= 14 && y >= 6 && y <= 7)
      ) {
        tiles[y][x] = 1;
      } else if (
        (x === 9 && y >= 2 && y <= 3) ||
        (x === 14 && y >= 2 && y <= 3) ||
        (x === 5 && y >= 10 && y <= 11) ||
        (x === 18 && y >= 10 && y <= 11)
      ) {
        tiles[y][x] = 2;
      } else if (
        (x >= 5 && x <= 8 && y >= 5 && y <= 7) ||
        (x >= 15 && x <= 18 && y >= 5 && y <= 7) ||
        (x >= 10 && x <= 13 && y >= 8 && y <= 10) ||
        (x >= 2 && x <= 3 && y >= 5 && y <= 7) ||
        (x >= 20 && x <= 21 && y >= 5 && y <= 7)
      ) {
        tiles[y][x] = 3;
      } else {
        tiles[y][x] = 0;
      }
    }
  }

  const enemies: Enemy[] = [
    {
      id: 'guard1',
      type: 'patrol',
      x: 400,
      y: 360,
      pathPoints: [
        { x: 400, y: 360 },
        { x: 760, y: 360 },
        { x: 760, y: 440 },
        { x: 400, y: 440 }
      ]
    },
    {
      id: 'guard2',
      type: 'patrol',
      x: 240,
      y: 480,
      pathPoints: [
        { x: 240, y: 480 },
        { x: 240, y: 560 },
        { x: 680, y: 560 },
        { x: 680, y: 480 }
      ]
    },
    {
      id: 'guard3',
      type: 'patrol',
      x: 800,
      y: 160,
      pathPoints: [
        { x: 800, y: 160 },
        { x: 880, y: 160 },
        { x: 880, y: 280 },
        { x: 800, y: 280 }
      ]
    },
    {
      id: 'light1',
      type: 'searchlight',
      x: 80,
      y: 40,
      pathPoints: [],
      visionAngle: Math.PI / 4,
      rotationSpeed: 0.022
    },
    {
      id: 'light2',
      type: 'searchlight',
      x: 880,
      y: 40,
      pathPoints: [],
      visionAngle: Math.PI - Math.PI / 4,
      rotationSpeed: -0.025
    },
    {
      id: 'light3',
      type: 'searchlight',
      x: 480,
      y: 40,
      pathPoints: [],
      visionAngle: Math.PI / 2,
      rotationSpeed: 0.015
    },
    {
      id: 'dog1',
      type: 'dog',
      x: 200,
      y: 280,
      pathPoints: [
        { x: 200, y: 280 },
        { x: 320, y: 280 }
      ]
    },
    {
      id: 'dog2',
      type: 'dog',
      x: 840,
      y: 480,
      pathPoints: [
        { x: 840, y: 480 },
        { x: 720, y: 480 },
        { x: 720, y: 560 },
        { x: 840, y: 560 }
      ]
    }
  ];

  const targetItems: TargetItem[] = [
    { id: 'item1', x: 200, y: 120, name: '主人的怀表', stealTime: 1500, stolen: false },
    { id: 'item2', x: 840, y: 120, name: '名画仿品', stealTime: 1500, stolen: false },
    { id: 'item3', x: 480, y: 520, name: '保险柜密码', stealTime: 1500, stolen: false }
  ];

  return {
    id: '3',
    name: '豪宅之夜',
    width: cols * tileSize,
    height: rows * tileSize,
    tileSize,
    tiles,
    enemies,
    targetItems,
    playerSpawn: { x: 60, y: 580 },
    exitPoint: { x: 900, y: 580 }
  };
}

const levelGenerators: Record<string, () => LevelData> = {
  '1': generateLevel1,
  '2': generateLevel2,
  '3': generateLevel3
};

function loadOrGenerateLevel(id: string): LevelData | null {
  if (levelsCache.has(id)) {
    return levelsCache.get(id)!;
  }

  const filePath = path.join(levelsDir, `${id}.json`);

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as LevelData;
      levelsCache.set(id, data);
      return data;
    }
  } catch (e) {
    console.warn(`Failed to read level ${id} from file, generating...`);
  }

  const generator = levelGenerators[id];
  if (!generator) return null;

  const levelData = generator();

  try {
    if (!fs.existsSync(levelsDir)) {
      fs.mkdirSync(levelsDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(levelData, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`Failed to save level ${id} to file:`, e);
  }

  levelsCache.set(id, levelData);
  return levelData;
}

app.get('/api/levels/:id', (req, res) => {
  const startTime = Date.now();
  const { id } = req.params;

  try {
    const levelData = loadOrGenerateLevel(id);

    if (!levelData) {
      return res.status(404).json({
        error: 'Level not found',
        message: `关卡 ${id} 不存在`
      });
    }

    const elapsed = Date.now() - startTime;
    const delay = Math.max(0, 50 - elapsed);

    setTimeout(() => {
      res.json(levelData);
    }, delay);
  } catch (error) {
    console.error('Error loading level:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '加载关卡数据失败'
    });
  }
});

app.get('/api/levels', (_req, res) => {
  const levels: Array<{ id: string; name: string; enemiesCount: number; itemsCount: number }> = [];

  for (const id of Object.keys(levelGenerators)) {
    const data = loadOrGenerateLevel(id);
    if (data) {
      levels.push({
        id: data.id,
        name: data.name,
        enemiesCount: data.enemies.length,
        itemsCount: data.targetItems.length
      });
    }
  }

  res.json({
    levels,
    totalLevels: levels.length
  });
});

app.post('/api/progress/save', (req, res) => {
  const { userId, progress } = req.body;
  const progressDir = path.join(__dirname, 'data', 'progress');

  try {
    if (!fs.existsSync(progressDir)) {
      fs.mkdirSync(progressDir, { recursive: true });
    }
    const safeUserId = (userId || uuidv4()).replace(/[^a-zA-Z0-9-_]/g, '_');
    const filePath = path.join(progressDir, `${safeUserId}.json`);
    fs.writeFileSync(filePath, JSON.stringify({
      progress,
      savedAt: new Date().toISOString()
    }, null, 2), 'utf-8');
    res.json({ success: true, userId: safeUserId });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ success: false, error: '保存进度失败' });
  }
});

app.get('/api/progress/:userId', (req, res) => {
  const { userId } = req.params;
  const progressDir = path.join(__dirname, 'data', 'progress');

  try {
    const safeUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filePath = path.join(progressDir, `${safeUserId}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      res.json(JSON.parse(raw));
    } else {
      res.json({ progress: {}, exists: false });
    }
  } catch (error) {
    console.error('Error loading progress:', error);
    res.status(500).json({ error: '加载进度失败' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cachedLevels: Array.from(levelsCache.keys())
  });
});

app.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════════╗`);
  console.log(`║     暗巷回声 - Dark Alley Echo           ║`);
  console.log(`╠══════════════════════════════════════════╣`);
  console.log(`║  🚀 后端服务器已启动                     ║`);
  console.log(`║  📡 端口: ${PORT}                           ║`);
  console.log(`║  📋 可用API:                              ║`);
  console.log(`║     GET  /api/levels/:id   获取关卡数据   ║`);
  console.log(`║     GET  /api/levels      关卡列表        ║`);
  console.log(`║     GET  /api/health      健康检查        ║`);
  console.log(`╚══════════════════════════════════════════╝`);
  console.log('');
});

export default app;
