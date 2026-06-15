import express from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const cardsDB = Datastore.create(join(__dirname, 'data', 'cards.db'));
const enemiesDB = Datastore.create(join(__dirname, 'data', 'enemies.db'));
const playersDB = Datastore.create(join(__dirname, 'data', 'players.db'));

const baseCards = [
  { id: 'strike_common', name: '打击', type: 'attack', rarity: 'common', cost: 1, value: 6, effect: null, desc: '造成6点伤害', weight: 30 },
  { id: 'strike_rare', name: '烈焰斩', type: 'attack', rarity: 'rare', cost: 2, value: 10, effect: { type: 'burn', value: 3, duration: 2 }, desc: '造成10点伤害，附加灼烧3层', weight: 10 },
  { id: 'strike_epic', name: '吸血打击', type: 'attack', rarity: 'epic', cost: 2, value: 12, effect: { type: 'lifesteal', value: 0.3 }, desc: '造成12点伤害，回复30%伤害生命', weight: 4 },
  { id: 'heavy_strike_common', name: '重击', type: 'attack', rarity: 'common', cost: 2, value: 12, effect: null, desc: '造成12点伤害', weight: 20 },
  { id: 'frost_strike_rare', name: '冰霜打击', type: 'attack', rarity: 'rare', cost: 1, value: 5, effect: { type: 'freeze', value: 1, duration: 1 }, desc: '造成5点伤害，冰冻敌人1回合', weight: 8 },
  { id: 'thunder_strike_epic', name: '雷霆一击', type: 'attack', rarity: 'epic', cost: 3, value: 20, effect: null, desc: '造成20点伤害', weight: 3 },
  { id: 'defend_common', name: '防御', type: 'defense', rarity: 'common', cost: 1, value: 5, effect: null, desc: '获得5点护盾', weight: 25 },
  { id: 'iron_wall_common', name: '铁壁', type: 'defense', rarity: 'common', cost: 2, value: 10, effect: null, desc: '获得10点护盾', weight: 15 },
  { id: 'ice_shield_rare', name: '冰霜护盾', type: 'defense', rarity: 'rare', cost: 2, value: 8, effect: { type: 'freeze', value: 1, duration: 1 }, desc: '获得8点护盾，冰冻敌人1回合', weight: 7 },
  { id: 'aegis_epic', name: '神盾', type: 'defense', rarity: 'epic', cost: 3, value: 20, effect: null, desc: '获得20点护盾', weight: 3 },
  { id: 'heal_common', name: '治疗', type: 'heal', rarity: 'common', cost: 1, value: 6, effect: null, desc: '恢复6点生命', weight: 20 },
  { id: 'greater_heal_common', name: '大治疗', type: 'heal', rarity: 'common', cost: 2, value: 12, effect: null, desc: '恢复12点生命', weight: 12 },
  { id: 'regen_rare', name: '生命涌动', type: 'heal', rarity: 'rare', cost: 2, value: 5, effect: { type: 'regen', value: 3, duration: 3 }, desc: '恢复5点生命，之后3回合每回合回复3点', weight: 6 },
  { id: 'divine_heal_epic', name: '神圣治愈', type: 'heal', rarity: 'epic', cost: 2, value: 20, effect: { type: 'cleanse', value: 1 }, desc: '恢复20点生命，清除负面状态', weight: 3 },
  { id: 'poison_strike_rare', name: '毒刃', type: 'attack', rarity: 'rare', cost: 1, value: 4, effect: { type: 'poison', value: 4, duration: 3 }, desc: '造成4点伤害，附加中毒4层', weight: 6 },
  { id: 'double_strike_epic', name: '双重打击', type: 'attack', rarity: 'epic', cost: 2, value: 8, effect: { type: 'double', value: 2 }, desc: '造成8点伤害两次', weight: 4 },
  { id: 'reflect_rare', name: '反射护盾', type: 'defense', rarity: 'rare', cost: 2, value: 6, effect: { type: 'reflect', value: 0.5 }, desc: '获得6点护盾，反弹50%伤害', weight: 5 },
  { id: 'rage_common', name: '狂怒', type: 'attack', rarity: 'common', cost: 0, value: 3, effect: null, desc: '造成3点伤害', weight: 18 }
];

const baseEnemies = [
  { id: 'slime', name: '史莱姆', maxHp: 25, atk: 5, def: 0, level: 1, desc: '黏糊糊的绿色生物' },
  { id: 'goblin', name: '哥布林', maxHp: 35, atk: 7, def: 1, level: 1, desc: '贪婪的小绿人' },
  { id: 'skeleton', name: '骷髅战士', maxHp: 45, atk: 9, def: 2, level: 2, desc: '不死的骨架战士' },
  { id: 'orc', name: '兽人', maxHp: 60, atk: 11, def: 3, level: 2, desc: '强壮的野蛮人' },
  { id: 'dark_mage', name: '黑暗法师', maxHp: 50, atk: 14, def: 1, level: 3, desc: '精通暗黑魔法' },
  { id: 'vampire', name: '吸血鬼', maxHp: 70, atk: 12, def: 2, level: 3, desc: '吸血的不死生物', effect: { type: 'lifesteal', value: 0.2 } },
  { id: 'golem', name: '石魔像', maxHp: 100, atk: 10, def: 6, level: 4, desc: '坚不可摧的石像' },
  { id: 'demon', name: '恶魔', maxHp: 85, atk: 16, def: 3, level: 4, desc: '来自地狱的恶魔', effect: { type: 'burn', value: 2, duration: 2 } },
  { id: 'dragon', name: '巨龙', maxHp: 150, atk: 20, def: 5, level: 5, desc: '传说中的巨龙', effect: { type: 'burn', value: 4, duration: 3 } }
];

const initialDeck = [
  { ...baseCards.find(c => c.id === 'strike_common'), uid: uuidv4() },
  { ...baseCards.find(c => c.id === 'strike_common'), uid: uuidv4() },
  { ...baseCards.find(c => c.id === 'strike_common'), uid: uuidv4() },
  { ...baseCards.find(c => c.id === 'defend_common'), uid: uuidv4() },
  { ...baseCards.find(c => c.id === 'defend_common'), uid: uuidv4() }
];

async function initDB() {
  try {
    const cardCount = await cardsDB.count({});
    if (cardCount === 0) {
      await cardsDB.insert(baseCards);
      console.log('初始化卡牌数据完成');
    }
    const enemyCount = await enemiesDB.count({});
    if (enemyCount === 0) {
      await enemiesDB.insert(baseEnemies);
      console.log('初始化敌人数据完成');
    }
  } catch (err) {
    console.error('初始化数据库失败:', err);
  }
}

initDB();

app.get('/api/cards', async (req, res) => {
  try {
    const { playerLevel = 1, rarity } = req.query;
    const query = {};
    if (rarity) query.rarity = rarity;
    const cards = await cardsDB.find(query);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: '获取卡牌列表失败' });
  }
});

app.get('/api/cards/random', async (req, res) => {
  try {
    const { count = 4, playerLevel = 1 } = req.query;
    const numCount = parseInt(count);
    const level = parseInt(playerLevel);

    const allCards = await cardsDB.find({});
    const weightedCards = [];

    allCards.forEach(card => {
      let weight = card.weight || 10;
      if (card.rarity === 'rare' && level >= 2) weight *= 1.5;
      if (card.rarity === 'epic' && level >= 3) weight *= 1.5;
      for (let i = 0; i < weight; i++) {
        weightedCards.push(card);
      }
    });

    const result = [];
    const usedIds = new Set();
    let attempts = 0;
    while (result.length < numCount && attempts < 1000) {
      const idx = Math.floor(Math.random() * weightedCards.length);
      const card = { ...weightedCards[idx], uid: uuidv4() };
      if (!usedIds.has(card.uid)) {
        usedIds.add(card.uid);
        result.push(card);
      }
      attempts++;
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取随机卡牌失败' });
  }
});

app.get('/api/enemies', async (req, res) => {
  try {
    const { level } = req.query;
    const query = {};
    if (level) query.level = { $lte: parseInt(level) };
    const enemies = await enemiesDB.find(query);
    res.json(enemies);
  } catch (err) {
    res.status(500).json({ error: '获取敌人列表失败' });
  }
});

app.get('/api/enemies/random', async (req, res) => {
  try {
    const { level = 1, count = 3 } = req.query;
    const lvl = parseInt(level);
    const numCount = parseInt(count);
    const query = { level: { $lte: Math.max(1, Math.min(5, Math.ceil(lvl / 2) + 1)) } };
    const enemies = await enemiesDB.find(query);

    const scaledEnemies = enemies.map(e => {
      const scale = 1 + (lvl - 1) * 0.15;
      return {
        ...e,
        instanceId: uuidv4(),
        maxHp: Math.round(e.maxHp * scale),
        hp: Math.round(e.maxHp * scale),
        atk: Math.round(e.atk * scale),
        def: Math.round(e.def * scale)
      };
    });

    const result = [];
    for (let i = 0; i < numCount; i++) {
      if (scaledEnemies.length === 0) break;
      const idx = Math.floor(Math.random() * scaledEnemies.length);
      result.push(scaledEnemies[idx]);
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取随机敌人失败' });
  }
});

app.post('/api/player', async (req, res) => {
  try {
    const players = await playersDB.find({});
    let player;
    if (players.length === 0) {
      player = {
        _id: uuidv4(),
        playerId: 'default',
        hp: 80,
        maxHp: 80,
        gold: 0,
        level: 1,
        stage: 1,
        deck: JSON.parse(JSON.stringify(initialDeck)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await playersDB.insert(player);
    } else {
      player = players[0];
    }
    res.json(player);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取玩家数据失败' });
  }
});

app.put('/api/player', async (req, res) => {
  try {
    const update = req.body;
    const players = await playersDB.find({});
    if (players.length === 0) {
      const player = {
        _id: uuidv4(),
        playerId: 'default',
        ...update,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await playersDB.insert(player);
      return res.json(player);
    }
    const player = players[0];
    const updated = { ...player, ...update, updatedAt: new Date().toISOString() };
    await playersDB.update({ _id: player._id }, { $set: updated });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '保存玩家数据失败' });
  }
});

app.delete('/api/player', async (req, res) => {
  try {
    await playersDB.remove({}, { multi: true });
    res.json({ message: '重置成功' });
  } catch (err) {
    res.status(500).json({ error: '重置失败' });
  }
});

app.post('/api/battle/complete', async (req, res) => {
  try {
    const { victory, goldEarned, cardReward, hpChange } = req.body;
    const players = await playersDB.find({});
    if (players.length === 0) {
      return res.status(404).json({ error: '玩家不存在' });
    }
    const player = players[0];
    const updates = {
      gold: player.gold + (goldEarned || 0),
      updatedAt: new Date().toISOString()
    };
    if (hpChange) {
      updates.hp = Math.max(1, Math.min(player.maxHp, player.hp + hpChange));
    }
    if (victory) {
      updates.stage = player.stage + 1;
      updates.level = Math.max(player.level, Math.floor(updates.stage / 3) + 1);
      if (cardReward) {
        updates.deck = [...player.deck, { ...cardReward, uid: uuidv4() }];
      }
    }
    if (updates.hp !== undefined && updates.hp <= 0) {
      updates.hp = 80;
      updates.maxHp = 80;
      updates.stage = 1;
      updates.level = 1;
      updates.deck = JSON.parse(JSON.stringify(initialDeck));
      updates.gold = 0;
    }
    const updated = { ...player, ...updates };
    await playersDB.update({ _id: player._id }, { $set: updated });
    res.json({ player: updated, victory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '战斗结算失败' });
  }
});

app.get('/api/chest/open', async (req, res) => {
  try {
    const rand = Math.random();
    let reward;
    if (rand < 0.5) {
      const allCards = await cardsDB.find({});
      const weightedCards = [];
      allCards.forEach(c => {
        for (let i = 0; i < (c.weight || 10); i++) weightedCards.push(c);
      });
      const idx = Math.floor(Math.random() * weightedCards.length);
      reward = { type: 'card', card: { ...weightedCards[idx], uid: uuidv4() } };
    } else if (rand < 0.8) {
      reward = { type: 'gold', amount: Math.floor(Math.random() * 50) + 50 };
    } else {
      reward = { type: 'heal', amount: Math.floor(Math.random() * 15) + 10 };
    }
    res.json(reward);
  } catch (err) {
    res.status(500).json({ error: '开箱失败' });
  }
});

app.listen(PORT, () => {
  console.log(`RogueCard 后端服务运行在 http://localhost:${PORT}`);
});
