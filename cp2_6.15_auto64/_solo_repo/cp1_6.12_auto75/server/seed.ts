import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbFile = path.join(dbDir, 'db.json');
const adapter = new JSONFile<DbData>(dbFile);
const db = new Low<DbData>(adapter, { sessions: [] });

const sessionNames = [
  '618开门红第一场',
  '双11零点秒杀场',
  '黑五限时特惠场',
  '周年庆超级场',
  '春季新品秒杀场',
  '暑期大促狂欢场',
  '中秋团圆特惠场',
  '国庆黄金周场',
  '年终清仓特卖场',
  '会员专享闪购场',
];

function generateSessionData(startTime: Date, peakMultiplier: number): TimePoint[] {
  const data: TimePoint[] = [];
  const totalPoints = 480;
  const intervalMinutes = 5;

  for (let i = 0; i < totalPoints; i++) {
    const time = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
    const hourOfDay = time.getHours() + time.getMinutes() / 60;

    const dayFactor = Math.sin((hourOfDay - 6) * Math.PI / 12) * 0.5 + 0.5;
    const peakFactor = Math.exp(-Math.pow((i - 120) / 80, 2)) * 0.8;
    const basePv = 5000 + dayFactor * 15000 + peakFactor * 30000 * peakMultiplier;
    const noise = (Math.random() - 0.5) * 3000;
    const pv = Math.max(500, Math.round(basePv + noise));

    const conversionBase = 0.02 + peakFactor * 0.04 * peakMultiplier;
    const conversionNoise = (Math.random() - 0.5) * 0.005;
    const conversionRate = Math.max(0.005, conversionBase + conversionNoise);
    const orders = Math.round(pv * conversionRate);

    const stockBase = peakFactor * 0.6 * peakMultiplier;
    const stockNoise = (Math.random() - 0.5) * 0.05;
    const stockUsedRate = Math.min(0.95, Math.max(0, stockBase + stockNoise));
    const stockUsed = Math.round(orders * 0.85 + pv * stockUsedRate * 0.1);

    data.push({
      timestamp: time.toISOString(),
      timeIndex: i,
      pv,
      orders,
      stockUsed,
    });
  }

  return data;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

async function seed() {
  const sessions: FlashSession[] = [];
  const baseDate = new Date('2024-06-01T00:00:00');

  for (let i = 0; i < 10; i++) {
    const startDate = new Date(baseDate.getTime() + i * 3 * 24 * 60 * 60 * 1000);
    const startHour = 8 + (i % 4) * 4;
    startDate.setHours(startHour, 0, 0, 0);

    const peakMultiplier = 0.6 + (i % 5) * 0.2;
    const data = generateSessionData(startDate, peakMultiplier);

    const totalPv = data.reduce((sum, d) => sum + d.pv, 0);
    const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
    const conversionRate = totalPv > 0 ? totalOrders / totalPv : 0;

    sessions.push({
      id: uuidv4(),
      name: sessionNames[i],
      startTime: formatDate(startDate),
      totalPv,
      totalOrders,
      conversionRate,
      data,
    });
  }

  db.data.sessions = sessions;
  await db.write();

  console.log(`\n种子数据生成完成！`);
  console.log(`- 共生成 ${sessions.length} 个场次`);
  console.log(`- 每个场次 ${sessions[0].data.length} 个时间点`);
  console.log(`- 数据文件: ${dbFile}\n`);

  sessions.forEach((s, idx) => {
    console.log(`  ${idx + 1}. ${s.name} - 转化率: ${(s.conversionRate * 100).toFixed(2)}%, 总PV: ${s.totalPv.toLocaleString()}`);
  });
}

seed().catch(console.error);
