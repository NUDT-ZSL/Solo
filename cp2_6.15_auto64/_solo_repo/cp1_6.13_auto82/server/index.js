import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const cardLibrary = [
  { id: 1, name: '蒸汽拳刃', type: 'attack', cost: 1, damage: 3, defense: 0, energy: 0, description: '造成3点伤害' },
  { id: 2, name: '铜盾格挡', type: 'defense', cost: 1, damage: 0, defense: 4, energy: 0, description: '获得4点护盾' },
  { id: 3, name: '能量充能', type: 'energy', cost: 0, damage: 0, defense: 0, energy: 2, description: '获得2点能量' },
  { id: 4, name: '燃烧弹', type: 'attack', cost: 2, damage: 6, defense: 0, energy: 0, description: '造成6点伤害' },
  { id: 5, name: '铁甲护甲', type: 'defense', cost: 2, damage: 0, defense: 7, energy: 0, description: '获得7点护盾' },
  { id: 6, name: '蒸汽喷射', type: 'attack', cost: 2, damage: 4, defense: 0, energy: 1, description: '造成4点伤害，获得1点能量' },
  { id: 7, name: '齿轮风暴', type: 'attack', cost: 3, damage: 8, defense: 0, energy: 0, description: '造成8点伤害' },
  { id: 8, name: '青铜壁垒', type: 'defense', cost: 3, damage: 0, defense: 10, energy: 0, description: '获得10点护盾' },
  { id: 9, name: '核心过载', type: 'energy', cost: 2, damage: 0, defense: 0, energy: 4, description: '获得4点能量' },
  { id: 10, name: '火箭飞拳', type: 'attack', cost: 3, damage: 6, defense: 3, energy: 0, description: '造成6点伤害，获得3点护盾' },
  { id: 11, name: '激光炮', type: 'attack', cost: 4, damage: 12, defense: 0, energy: 0, description: '造成12点伤害' },
  { id: 12, name: '蒸汽堡垒', type: 'defense', cost: 4, damage: 0, defense: 14, energy: 0, description: '获得14点护盾' },
  { id: 13, name: '能量虹吸', type: 'attack', cost: 3, damage: 5, defense: 0, energy: 3, description: '造成5点伤害，获得3点能量' },
  { id: 14, name: '电磁脉冲', type: 'attack', cost: 4, damage: 9, defense: 0, energy: 2, description: '造成9点伤害，获得2点能量' },
  { id: 15, name: '终焉炮', type: 'attack', cost: 5, damage: 18, defense: 0, energy: 0, description: '造成18点伤害' },
  { id: 16, name: '天神护盾', type: 'defense', cost: 5, damage: 0, defense: 20, energy: 0, description: '获得20点护盾' },
  { id: 17, name: '闪电链', type: 'attack', cost: 3, damage: 7, defense: 0, energy: 1, description: '造成7点伤害，获得1点能量' },
  { id: 18, name: '钢甲战靴', type: 'defense', cost: 1, damage: 0, defense: 3, energy: 1, description: '获得3点护盾和1点能量' },
  { id: 19, name: '蒸汽手枪', type: 'attack', cost: 1, damage: 4, defense: 0, energy: 0, description: '造成4点伤害' },
  { id: 20, name: '熔炉之怒', type: 'attack', cost: 4, damage: 10, defense: 2, energy: 0, description: '造成10点伤害，获得2点护盾' },
  { id: 21, name: '机械钩爪', type: 'attack', cost: 2, damage: 5, defense: 0, energy: 0, description: '造成5点伤害' },
  { id: 22, name: '蒸汽护罩', type: 'defense', cost: 3, damage: 2, defense: 8, energy: 0, description: '造成2点伤害，获得8点护盾' },
  { id: 23, name: '能量转换', type: 'energy', cost: 1, damage: 0, defense: 2, energy: 2, description: '获得2点护盾和2点能量' },
  { id: 24, name: '烈焰喷射器', type: 'attack', cost: 5, damage: 15, defense: 0, energy: 0, description: '造成15点伤害' },
  { id: 25, name: '反应炉', type: 'energy', cost: 3, damage: 0, defense: 0, energy: 5, description: '获得5点能量' },
  { id: 26, name: '机关枪', type: 'attack', cost: 4, damage: 11, defense: 0, energy: 0, description: '造成11点伤害' },
  { id: 27, name: '黄铜护甲', type: 'defense', cost: 2, damage: 0, defense: 6, energy: 0, description: '获得6点护盾' },
  { id: 28, name: '蒸汽长矛', type: 'attack', cost: 2, damage: 5, defense: 2, energy: 0, description: '造成5点伤害，获得2点护盾' },
  { id: 29, name: '齿轮盾牌', type: 'defense', cost: 4, damage: 0, defense: 12, energy: 0, description: '获得12点护盾' },
  { id: 30, name: '聚能光束', type: 'attack', cost: 5, damage: 16, defense: 0, energy: 0, description: '造成16点伤害' },
  { id: 31, name: '动力核心', type: 'energy', cost: 4, damage: 0, defense: 5, energy: 5, description: '获得5点护盾和5点能量' },
  { id: 32, name: '蒸汽链锯', type: 'attack', cost: 3, damage: 9, defense: 0, energy: 0, description: '造成9点伤害' },
  { id: 33, name: '钢铁头盔', type: 'defense', cost: 1, damage: 0, defense: 5, energy: 0, description: '获得5点护盾' },
  { id: 34, name: '蒸汽炮塔', type: 'attack', cost: 4, damage: 13, defense: 0, energy: 0, description: '造成13点伤害' },
  { id: 35, name: '核能冲击', type: 'attack', cost: 5, damage: 14, defense: 0, energy: 3, description: '造成14点伤害，获得3点能量' },
  { id: 36, name: '磁力护盾', type: 'defense', cost: 3, damage: 0, defense: 9, energy: 1, description: '获得9点护盾和1点能量' },
  { id: 37, name: '毒刺飞镖', type: 'attack', cost: 1, damage: 2, defense: 0, energy: 2, description: '造成2点伤害，获得2点能量' },
  { id: 38, name: '巨型铜锤', type: 'attack', cost: 3, damage: 7, defense: 2, energy: 0, description: '造成7点伤害，获得2点护盾' },
  { id: 39, name: '蒸汽引擎', type: 'energy', cost: 2, damage: 0, defense: 0, energy: 3, description: '获得3点能量' },
  { id: 40, name: '毁灭射线', type: 'attack', cost: 5, damage: 20, defense: 0, energy: 0, description: '造成20点伤害' }
];

const initialDeck = [
  1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30
];

app.get('/cards', (req, res) => {
  res.json({ cards: cardLibrary });
});

app.get('/decks', (req, res) => {
  const cards = initialDeck.map(id => cardLibrary.find(c => c.id === id));
  res.json({ deck: cards });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`SteamBurst server running on port ${PORT}`);
});
