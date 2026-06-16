import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generatePlantSchedule } from '../business/calendarLogic.js';
import type { Seed, ClaimedSeed, GardenEvent, ClaimRequest, AddEventRequest } from '../types/index.js';

const app = express();
app.use(express.json());

const seeds: Seed[] = [
  {
    id: 'seed-1',
    name: '番茄',
    variety: '圣女果',
    description: '小巧甜蜜的圣女果，适合阳台种植，产量丰富',
    provider: '绿手指小王',
    availableCount: 8,
    color: '#E53935',
    gradientStart: '#FF6F61',
    gradientEnd: '#E53935',
    growthDays: { germination: 7, thinning: 14, growth: 35, flowering: 21, fruiting: 28, total: 105 },
    optimalSeason: ['春', '夏'],
  },
  {
    id: 'seed-2',
    name: '黄瓜',
    variety: '旱黄瓜',
    description: '清脆爽口的旱黄瓜，生长速度快，新手友好',
    provider: '田园阿姨',
    availableCount: 5,
    color: '#43A047',
    gradientStart: '#66BB6A',
    gradientEnd: '#2E7D32',
    growthDays: { germination: 5, thinning: 10, growth: 25, flowering: 15, fruiting: 20, total: 75 },
    optimalSeason: ['春', '夏'],
  },
  {
    id: 'seed-3',
    name: '向日葵',
    variety: '矮生向日葵',
    description: '矮生品种，适合盆栽，花朵灿烂金黄',
    provider: '花语小李',
    availableCount: 12,
    color: '#FDD835',
    gradientStart: '#FFEE58',
    gradientEnd: '#F9A825',
    growthDays: { germination: 7, thinning: 10, growth: 30, flowering: 25, fruiting: 20, total: 92 },
    optimalSeason: ['春', '夏'],
  },
  {
    id: 'seed-4',
    name: '辣椒',
    variety: '朝天椒',
    description: '辣味十足的朝天椒，观赏食用两相宜',
    provider: '辣妹子阿红',
    availableCount: 6,
    color: '#D32F2F',
    gradientStart: '#EF5350',
    gradientEnd: '#B71C1C',
    growthDays: { germination: 10, thinning: 14, growth: 40, flowering: 20, fruiting: 30, total: 114 },
    optimalSeason: ['春', '夏'],
  },
  {
    id: 'seed-5',
    name: '生菜',
    variety: '奶油生菜',
    description: '口感柔嫩的奶油生菜，生长周期短，可多次采收',
    provider: '沙拉达人阿明',
    availableCount: 15,
    color: '#7CB342',
    gradientStart: '#9CCC65',
    gradientEnd: '#558B2F',
    growthDays: { germination: 4, thinning: 7, growth: 20, flowering: 15, fruiting: 10, total: 56 },
    optimalSeason: ['春', '秋'],
  },
  {
    id: 'seed-6',
    name: '薰衣草',
    variety: '英国薰衣草',
    description: '芳香宜人的薰衣草，驱蚊效果佳，干燥后可做香包',
    provider: '香气花园主',
    availableCount: 4,
    color: '#7E57C2',
    gradientStart: '#9575CD',
    gradientEnd: '#512DA8',
    growthDays: { germination: 14, thinning: 14, growth: 45, flowering: 30, fruiting: 21, total: 124 },
    optimalSeason: ['春'],
  },
  {
    id: 'seed-7',
    name: '南瓜',
    variety: '迷你南瓜',
    description: '可爱小巧的迷你南瓜，观赏与烹饪均可',
    provider: '丰收大叔',
    availableCount: 3,
    color: '#EF6C00',
    gradientStart: '#FF9800',
    gradientEnd: '#E65100',
    growthDays: { germination: 7, thinning: 14, growth: 40, flowering: 21, fruiting: 35, total: 117 },
    optimalSeason: ['春', '夏'],
  },
  {
    id: 'seed-8',
    name: '牵牛花',
    variety: '日本牵牛',
    description: '清晨绽放的美丽藤蔓，适合篱笆和阳台',
    provider: '晨花爱好者',
    availableCount: 10,
    color: '#1E88E5',
    gradientStart: '#42A5F5',
    gradientEnd: '#1565C0',
    growthDays: { germination: 5, thinning: 7, growth: 25, flowering: 20, fruiting: 15, total: 72 },
    optimalSeason: ['春', '夏'],
  },
  {
    id: 'seed-9',
    name: '胡萝卜',
    variety: '迷你胡萝卜',
    description: '短根迷你品种，适合容器种植，甜脆可口',
    provider: '兔兔妈妈',
    availableCount: 7,
    color: '#FF8F00',
    gradientStart: '#FFB300',
    gradientEnd: '#E65100',
    growthDays: { germination: 10, thinning: 14, growth: 45, flowering: 20, fruiting: 21, total: 110 },
    optimalSeason: ['春', '秋'],
  },
  {
    id: 'seed-10',
    name: '薄荷',
    variety: '留兰香薄荷',
    description: '清凉提神的薄荷，生长旺盛可做茶饮和调味',
    provider: '茶香园丁',
    availableCount: 9,
    color: '#26A69A',
    gradientStart: '#4DB6AC',
    gradientEnd: '#00695C',
    growthDays: { germination: 7, thinning: 7, growth: 20, flowering: 25, fruiting: 14, total: 73 },
    optimalSeason: ['春', '夏'],
  },
  {
    id: 'seed-11',
    name: '草莓',
    variety: '四季草莓',
    description: '可四季结果的草莓品种，果实鲜甜多汁',
    provider: '浆果控小陈',
    availableCount: 2,
    color: '#C62828',
    gradientStart: '#EF5350',
    gradientEnd: '#8E0000',
    growthDays: { germination: 10, thinning: 10, growth: 35, flowering: 20, fruiting: 25, total: 100 },
    optimalSeason: ['春', '秋'],
  },
  {
    id: 'seed-12',
    name: '豌豆',
    variety: '甜豌豆',
    description: '清甜的攀缘豌豆，嫩荚嫩粒均可食用',
    provider: '豆豆爷爷',
    availableCount: 6,
    color: '#66BB6A',
    gradientStart: '#81C784',
    gradientEnd: '#388E3C',
    growthDays: { germination: 6, thinning: 10, growth: 30, flowering: 18, fruiting: 20, total: 84 },
    optimalSeason: ['春'],
  },
];

const claimedSeeds: ClaimedSeed[] = [];
const gardenEvents: GardenEvent[] = [];

app.get('/api/seeds', (_req, res) => {
  res.json(seeds);
});

app.post('/api/seeds/claim', (req: express.Request<unknown, unknown, ClaimRequest>, res) => {
  const { seedId, userId } = req.body;

  if (!seedId || !userId) {
    res.status(400).json({ success: false, message: '缺少seedId或userId' });
    return;
  }

  const seed = seeds.find(s => s.id === seedId);
  if (!seed) {
    res.status(404).json({ success: false, message: '种子不存在' });
    return;
  }

  if (seed.availableCount <= 0) {
    res.status(400).json({ success: false, message: '该种子已无库存，请等待补货' });
    return;
  }

  seed.availableCount--;

  const schedule = generatePlantSchedule(seed);
  const claimedSeed: ClaimedSeed = {
    id: uuidv4(),
    seedId: seed.id,
    userId,
    claimedAt: new Date().toISOString(),
    schedule,
    seed,
  };

  claimedSeeds.push(claimedSeed);

  const sowingEvent: GardenEvent = {
    id: uuidv4(),
    claimedSeedId: claimedSeed.id,
    seedId: seed.id,
    userId,
    date: schedule.sowingDate,
    type: 'sowing',
    note: '认领时自动安排播种',
    completed: false,
  };
  gardenEvents.push(sowingEvent);

  res.json({ success: true, claimedSeed });
});

app.get('/api/garden/:userId', (req, res) => {
  const { userId } = req.params;
  const userClaimedSeeds = claimedSeeds.filter(cs => cs.userId === userId);
  const userEvents = gardenEvents.filter(e => e.userId === userId);

  res.json({
    claimedSeeds: userClaimedSeeds,
    events: userEvents,
  });
});

app.post('/api/garden/event', (req: express.Request<unknown, unknown, AddEventRequest>, res) => {
  const { claimedSeedId, seedId, userId, date, type, note, completed } = req.body;

  if (!claimedSeedId || !seedId || !userId || !date || !type) {
    res.status(400).json({ success: false, message: '缺少必要参数' });
    return;
  }

  if (note && note.length > 50) {
    res.status(400).json({ success: false, message: '备注不能超过50字' });
    return;
  }

  const newEvent: GardenEvent = {
    id: uuidv4(),
    claimedSeedId,
    seedId,
    userId,
    date,
    type,
    note: note || '',
    completed: completed ?? false,
  };

  gardenEvents.push(newEvent);

  res.json({ success: true, event: newEvent });
});

app.put('/api/garden/event/:eventId', (req, res) => {
  const { eventId } = req.params;
  const { date, type, note, completed } = req.body;

  const eventIndex = gardenEvents.findIndex(e => e.id === eventId);
  if (eventIndex === -1) {
    res.status(404).json({ success: false, message: '事件不存在' });
    return;
  }

  if (date) gardenEvents[eventIndex].date = date;
  if (type) gardenEvents[eventIndex].type = type;
  if (note !== undefined) gardenEvents[eventIndex].note = note;
  if (completed !== undefined) gardenEvents[eventIndex].completed = completed;

  res.json({ success: true, event: gardenEvents[eventIndex] });
});

app.put('/api/garden/schedule/:claimedSeedId', (req, res) => {
  const { claimedSeedId } = req.params;
  const scheduleUpdates = req.body;

  const claimed = claimedSeeds.find(cs => cs.id === claimedSeedId);
  if (!claimed) {
    res.status(404).json({ success: false, message: '认领记录不存在' });
    return;
  }

  Object.assign(claimed.schedule, scheduleUpdates);

  res.json({ success: true, schedule: claimed.schedule });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🌱 种子图书馆后端服务运行在 http://localhost:${PORT}`);
});
