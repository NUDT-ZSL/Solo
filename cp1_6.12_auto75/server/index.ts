import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface TimePoint {
  timestamp: string;
  timeIndex: number;
  pv: number;
  orders: number;
  stockUsed: number;
}

interface FlashSession {
  id: string;
  name: string;
  startTime: string;
  totalPv: number;
  totalOrders: number;
  conversionRate: number;
  data: TimePoint[];
}

interface DbData {
  sessions: FlashSession[];
}

interface SessionSummary {
  id: string;
  name: string;
  startTime: string;
  totalPv: number;
  totalOrders: number;
  conversionRate: number;
}

const dbFile = path.join(__dirname, '..', 'data', 'db.json');
const adapter = new JSONFile<DbData>(dbFile);
const db = new Low<DbData>(adapter, { sessions: [] });

async function initDb() {
  try {
    await db.read();
    if (!db.data.sessions || db.data.sessions.length === 0) {
      console.warn('警告: 数据库为空，请先运行 npm run seed 生成种子数据');
    } else {
      console.log(`已加载 ${db.data.sessions.length} 个场次数据`);
    }
  } catch (err) {
    console.error('读取数据库失败:', err);
  }
}

app.get('/api/sessions', async (_req, res) => {
  try {
    await db.read();
    const summaries: SessionSummary[] = db.data.sessions.map((s) => ({
      id: s.id,
      name: s.name,
      startTime: s.startTime,
      totalPv: s.totalPv,
      totalOrders: s.totalOrders,
      conversionRate: s.conversionRate,
    }));
    res.json(summaries);
  } catch (err) {
    console.error('获取场次列表失败:', err);
    res.status(500).json({ error: '获取场次列表失败' });
  }
});

app.get('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    const session = db.data.sessions.find((s) => s.id === id);

    if (!session) {
      res.status(404).json({ error: '场次不存在' });
      return;
    }

    res.json(session);
  } catch (err) {
    console.error('获取场次详情失败:', err);
    res.status(500).json({ error: '获取场次详情失败' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', sessions: db.data.sessions.length });
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`\nFlashAnalytics 后端服务已启动`);
  console.log(`- 端口: ${PORT}`);
  console.log(`- 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`- 场次列表: http://localhost:${PORT}/api/sessions\n`);
});
