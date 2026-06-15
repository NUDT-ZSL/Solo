import express, { Request, Response } from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Card, GameRecord, AIConfig } from '../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const dbDir = path.join(__dirname, '..', 'data');
const cardsDb = Datastore.create(path.join(dbDir, 'cards.db'));
const statsDb = Datastore.create(path.join(dbDir, 'stats.db'));
const aiConfigDb = Datastore.create(path.join(dbDir, 'ai-config.db'));

const defaultCards: Card[] = [
  { id: 'atk_1', type: 'attack', name: '火球术', description: '对目标造成3点伤害', value: 3, cost: 0 },
  { id: 'atk_2', type: 'attack', name: '重击', description: '对目标造成4点伤害', value: 4, cost: 0 },
  { id: 'atk_3', type: 'attack', name: '致命一击', description: '对目标造成5点伤害', value: 5, cost: 0 },
  { id: 'def_1', type: 'defense', name: '护盾术', description: '获得2点护盾', value: 2, cost: 0 },
  { id: 'def_2', type: 'defense', name: '铁壁', description: '获得3点护盾', value: 3, cost: 0 },
  { id: 'def_3', type: 'defense', name: '圣光庇护', description: '获得4点护盾', value: 4, cost: 0 },
  { id: 'sum_1', type: 'summon', name: '小兵', description: '召唤1攻1血单位', value: 1, value2: 1, cost: 0 },
  { id: 'sum_2', type: 'summon', name: '战士', description: '召唤2攻2血单位', value: 2, value2: 2, cost: 0 },
  { id: 'sum_3', type: 'summon', name: '精英', description: '召唤2攻3血单位', value: 2, value2: 3, cost: 0 },
  { id: 'sum_4', type: 'summon', name: '骑士', description: '召唤1攻3血单位', value: 1, value2: 3, cost: 0 },
];

const defaultAIConfig: AIConfig = {
  thinkTimeMs: 2000,
  attackUnitPriority: 1.5,
  lowHealthThreshold: 15,
  defenseUrgencyWeight: 2.0,
  summonWhenNoUnitBonus: 3.0,
};

async function initDatabase() {
  const cardCount = await cardsDb.count({});
  if (cardCount === 0) {
    await cardsDb.insert(defaultCards);
    console.log('卡牌库初始化完成');
  }

  const configCount = await aiConfigDb.count({});
  if (configCount === 0) {
    await aiConfigDb.insert(defaultAIConfig);
    console.log('AI配置初始化完成');
  }
}

app.get('/api/cards', async (_req: Request, res: Response) => {
  try {
    const cards = await cardsDb.find({});
    res.json({ cards });
  } catch (error) {
    res.status(500).json({ error: '获取卡牌库失败' });
  }
});

app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const records = await statsDb.find({}).sort({ endTime: -1 });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: '获取战绩失败' });
  }
});

app.post('/api/stats', async (req: Request, res: Response) => {
  try {
    const record: Omit<GameRecord, '_id'> = req.body;
    const newRecord = {
      ...record,
      _id: uuidv4(),
    };
    const inserted = await statsDb.insert(newRecord);
    res.json({ success: true, record: inserted });
  } catch (error) {
    res.status(500).json({ error: '保存战绩失败' });
  }
});

app.get('/api/ai-config', async (_req: Request, res: Response) => {
  try {
    const configs = await aiConfigDb.find({});
    const config = configs.length > 0 ? configs[0] : defaultAIConfig;
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: '获取AI配置失败' });
  }
});

app.listen(PORT, async () => {
  console.log(`后端服务器运行在端口 ${PORT}`);
  await initDatabase();
});
