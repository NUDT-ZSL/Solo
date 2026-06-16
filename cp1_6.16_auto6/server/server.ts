import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Card, Deck, BattleRecord } from '../src/types';

const app = express();
const PORT = 3001;

app.use(express.json());

const cardPool: Card[] = [
  { id: 'c1', name: '烈焰法师', cost: 2, attack: 2, health: 3, effectType: 'DAMAGE_ALL', effectValue: 2, effectName: '烈焰风暴', description: '对敌方所有单位造成2点伤害' },
  { id: 'c2', name: '圣光牧师', cost: 3, attack: 1, health: 4, effectType: 'HEAL_SELF', effectValue: 3, effectName: '圣光治愈', description: '部署时恢复己方英雄3点生命' },
  { id: 'c3', name: '狂战士', cost: 4, attack: 5, health: 4, effectType: 'BUFF_ATK', effectValue: 2, effectName: '狂暴之力', description: '回合结束时攻击力+2' },
  { id: 'c4', name: '预言家', cost: 2, attack: 1, health: 2, effectType: 'DRAW_CARD', effectValue: 2, effectName: '预知', description: '部署时抽2张牌' },
  { id: 'c5', name: '暗影刺客', cost: 3, attack: 4, health: 2, effectType: 'DAMAGE_ALL', effectValue: 1, effectName: '暗影之刃', description: '对敌方所有单位造成1点伤害' },
  { id: 'c6', name: '石像守卫', cost: 1, attack: 1, health: 4, effectType: 'HEAL_SELF', effectValue: 2, effectName: '石肤术', description: '部署时恢复己方英雄2点生命' },
  { id: 'c7', name: '火焰巨龙', cost: 5, attack: 6, health: 6, effectType: 'DAMAGE_ALL', effectValue: 3, effectName: '龙息', description: '对敌方所有单位造成3点伤害' },
  { id: 'c8', name: '精灵弓手', cost: 2, attack: 3, health: 2, effectType: 'BUFF_ATK', effectValue: 1, effectName: '专注', description: '回合结束时攻击力+1' },
  { id: 'c9', name: '治疗术士', cost: 4, attack: 2, health: 5, effectType: 'HEAL_SELF', effectValue: 5, effectName: '生命之泉', description: '部署时恢复己方英雄5点生命' },
  { id: 'c10', name: '学者', cost: 1, attack: 1, health: 1, effectType: 'DRAW_CARD', effectValue: 1, effectName: '研读', description: '部署时抽1张牌' },
  { id: 'c11', name: '战争领主', cost: 5, attack: 4, health: 7, effectType: 'BUFF_ATK', effectValue: 3, effectName: '战争号角', description: '回合结束时攻击力+3' },
  { id: 'c12', name: '冰霜女巫', cost: 3, attack: 2, health: 3, effectType: 'DAMAGE_ALL', effectValue: 2, effectName: '冰霜新星', description: '对敌方所有单位造成2点伤害' },
  { id: 'c13', name: '圣骑士', cost: 4, attack: 3, health: 5, effectType: 'HEAL_SELF', effectValue: 4, effectName: '神圣护盾', description: '部署时恢复己方英雄4点生命' },
  { id: 'c14', name: '盗贼', cost: 2, attack: 2, health: 2, effectType: 'DRAW_CARD', effectValue: 2, effectName: '偷袭', description: '部署时抽2张牌' },
  { id: 'c15', name: '地狱火', cost: 5, attack: 7, health: 5, effectType: 'DAMAGE_ALL', effectValue: 4, effectName: '地狱烈焰', description: '对敌方所有单位造成4点伤害' },
  { id: 'c16', name: '大地元素', cost: 3, attack: 2, health: 5, effectType: 'BUFF_ATK', effectValue: 1, effectName: '岩石之力', description: '回合结束时攻击力+1' },
  { id: 'c17', name: '生命祭司', cost: 2, attack: 1, health: 3, effectType: 'HEAL_SELF', effectValue: 3, effectName: '生命祝福', description: '部署时恢复己方英雄3点生命' },
  { id: 'c18', name: '大法师', cost: 4, attack: 3, health: 4, effectType: 'DRAW_CARD', effectValue: 3, effectName: '奥术智慧', description: '部署时抽3张牌' },
  { id: 'c19', name: '恶魔猎手', cost: 3, attack: 4, health: 3, effectType: 'BUFF_ATK', effectValue: 2, effectName: '恶魔之怒', description: '回合结束时攻击力+2' },
  { id: 'c20', name: '末日守卫', cost: 5, attack: 5, health: 8, effectType: 'DAMAGE_ALL', effectValue: 2, effectName: '末日降临', description: '对敌方所有单位造成2点伤害' },
];

let savedDecks: Deck[] = [];
let battleRecords: BattleRecord[] = [];

const aiDecks: Deck[] = [
  {
    id: 'ai-deck-1',
    name: 'AI攻击卡组',
    cardIds: ['c1', 'c5', 'c7', 'c12', 'c15', 'c3', 'c8', 'c11', 'c19', 'c20'],
    createdAt: Date.now()
  }
];

app.get('/api/cards', (_req: Request, res: Response<Card[]>) => {
  res.json(cardPool);
});

app.get('/api/decks', (_req: Request, res: Response<Deck[]>) => {
  res.json(savedDecks);
});

app.post('/api/decks', (req: Request<{}, {}, { cardIds: string[]; name?: string }>, res: Response<Deck>) => {
  const { cardIds, name = '我的卡组' } = req.body;
  
  if (!Array.isArray(cardIds) || cardIds.length === 0 || cardIds.length > 10) {
    return res.status(400).json({} as Deck);
  }
  
  const validCardIds = cardIds.filter(id => cardPool.some(c => c.id === id));
  if (validCardIds.length !== cardIds.length) {
    return res.status(400).json({} as Deck);
  }
  
  const newDeck: Deck = {
    id: uuidv4(),
    name,
    cardIds: validCardIds,
    createdAt: Date.now()
  };
  
  savedDecks = [newDeck];
  res.json(newDeck);
});

app.get('/api/decks/ai', (_req: Request, res: Response<Deck>) => {
  res.json(aiDecks[0]);
});

app.get('/api/battles', (_req: Request, res: Response<BattleRecord[]>) => {
  res.json(battleRecords.sort((a, b) => b.createdAt - a.createdAt));
});

app.post('/api/battles', (req: Request<{}, {}, Omit<BattleRecord, 'id' | 'createdAt'>>, res: Response<BattleRecord>) => {
  const { playerDeckId, aiDeckId, winner, turns, logs } = req.body;
  
  if (!playerDeckId || !aiDeckId || !winner || !turns || !logs) {
    return res.status(400).json({} as BattleRecord);
  }
  
  const newRecord: BattleRecord = {
    id: uuidv4(),
    playerDeckId,
    aiDeckId,
    winner,
    turns,
    logs,
    createdAt: Date.now()
  };
  
  battleRecords.push(newRecord);
  res.json(newRecord);
});

app.listen(PORT, () => {
  console.log(`卡牌对战服务器运行在 http://localhost:${PORT}`);
});
