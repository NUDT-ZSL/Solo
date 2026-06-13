import express, { Request, Response } from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { Level, MissionLog } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const dbPath = path.join(__dirname, '..', 'data', 'mission-logs.db');
const logsDb = Datastore.create({ filename: dbPath, autoload: true });

function createEmptyMap(): number[][] {
  const map: number[][] = [];
  for (let y = 0; y < 15; y++) {
    const row: number[] = [];
    for (let x = 0; x < 20; x++) {
      if (x === 0 || x === 19 || y === 0 || y === 14) {
        row.push(1);
      } else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

function createLevel1Map(): number[][] {
  const map = createEmptyMap();
  for (let x = 3; x <= 7; x++) map[4][x] = 1;
  for (let y = 4; y <= 8; y++) map[y][7] = 1;
  for (let x = 11; x <= 17; x++) map[4][x] = 1;
  for (let y = 7; y <= 11; y++) map[y][11] = 1;
  for (let x = 3; x <= 10; x++) map[11][x] = 1;
  for (let y = 2; y <= 5; y++) map[y][14] = 1;
  return map;
}

function createLevel2Map(): number[][] {
  const map = createEmptyMap();
  for (let y = 2; y <= 6; y++) map[y][5] = 1;
  for (let x = 5; x <= 12; x++) map[6][x] = 1;
  for (let y = 3; y <= 9; y++) map[y][14] = 1;
  for (let x = 2; x <= 8; x++) map[9][x] = 1;
  for (let y = 10; y <= 13; y++) map[y][8] = 1;
  for (let x = 10; x <= 17; x++) map[12][x] = 1;
  return map;
}

function createLevel3Map(): number[][] {
  const map = createEmptyMap();
  for (let x = 2; x <= 6; x++) map[3][x] = 1;
  for (let y = 3; y <= 7; y++) map[y][6] = 1;
  for (let x = 9; x <= 14; x++) map[3][x] = 1;
  for (let y = 3; y <= 5; y++) map[y][9] = 1;
  for (let x = 3; x <= 10; x++) map[7][x] = 1;
  for (let y = 7; y <= 11; y++) map[y][10] = 1;
  for (let x = 13; x <= 18; x++) map[7][x] = 1;
  for (let y = 7; y <= 12; y++) map[y][13] = 1;
  for (let x = 5; x <= 15; x++) map[12][x] = 1;
  return map;
}

const levels: Level[] = [
  {
    id: 1,
    name: '渗透训练',
    mission: '潜入基地，窃取第一份数据终端',
    map: createLevel1Map(),
    playerStart: { x: 1, y: 1 },
    dataTerminal: { x: 17, y: 12 },
    enemies: [
      {
        id: 'enemy-1',
        patrolPath: [
          { x: 10, y: 2 },
          { x: 17, y: 2 },
          { x: 17, y: 7 },
          { x: 10, y: 7 }
        ]
      },
      {
        id: 'enemy-2',
        patrolPath: [
          { x: 2, y: 6 },
          { x: 2, y: 12 },
          { x: 6, y: 12 }
        ]
      }
    ],
    empZones: [
      { x: 9, y: 8, radius: 2 },
      { x: 15, y: 6, radius: 2 }
    ]
  },
  {
    id: 2,
    name: '走廊迷踪',
    mission: '穿越巡逻走廊，获取加密数据',
    map: createLevel2Map(),
    playerStart: { x: 1, y: 1 },
    dataTerminal: { x: 18, y: 13 },
    enemies: [
      {
        id: 'enemy-1',
        patrolPath: [
          { x: 3, y: 4 },
          { x: 3, y: 1 },
          { x: 13, y: 1 },
          { x: 13, y: 4 }
        ]
      },
      {
        id: 'enemy-2',
        patrolPath: [
          { x: 10, y: 7 },
          { x: 17, y: 7 },
          { x: 17, y: 11 }
        ]
      },
      {
        id: 'enemy-3',
        patrolPath: [
          { x: 1, y: 11 },
          { x: 6, y: 11 },
          { x: 6, y: 13 }
        ]
      }
    ],
    empZones: [
      { x: 7, y: 8, radius: 2 },
      { x: 16, y: 3, radius: 2 },
      { x: 12, y: 11, radius: 2 }
    ]
  },
  {
    id: 3,
    name: '核心数据库',
    mission: '潜入核心区域，窃取最高机密',
    map: createLevel3Map(),
    playerStart: { x: 1, y: 1 },
    dataTerminal: { x: 18, y: 13 },
    enemies: [
      {
        id: 'enemy-1',
        patrolPath: [
          { x: 4, y: 5 },
          { x: 4, y: 1 },
          { x: 8, y: 1 },
          { x: 8, y: 5 }
        ]
      },
      {
        id: 'enemy-2',
        patrolPath: [
          { x: 11, y: 1 },
          { x: 16, y: 1 },
          { x: 16, y: 5 },
          { x: 11, y: 5 }
        ]
      },
      {
        id: 'enemy-3',
        patrolPath: [
          { x: 2, y: 9 },
          { x: 8, y: 9 },
          { x: 8, y: 11 },
          { x: 2, y: 11 }
        ]
      },
      {
        id: 'enemy-4',
        patrolPath: [
          { x: 15, y: 9 },
          { x: 17, y: 9 },
          { x: 17, y: 11 },
          { x: 15, y: 11 }
        ]
      }
    ],
    empZones: [
      { x: 5, y: 10, radius: 2 },
      { x: 11, y: 5, radius: 2 },
      { x: 16, y: 10, radius: 2 }
    ]
  }
];

app.get('/api/levels', (req: Request, res: Response) => {
  res.json(levels);
});

app.post('/api/logs', async (req: Request, res: Response) => {
  try {
    const log: MissionLog = req.body;
    const logWithId = {
      ...log,
      _id: uuidv4()
    };
    const inserted = await logsDb.insert(logWithId);
    res.json({ success: true, logId: inserted._id });
  } catch (error) {
    console.error('Failed to save log:', error);
    res.status(500).json({ success: false, error: 'Failed to save log' });
  }
});

app.listen(PORT, () => {
  console.log(`[StealthSignal] API server running on http://localhost:${PORT}`);
});
