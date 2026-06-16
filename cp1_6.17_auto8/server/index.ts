import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { computeChallengeScore } from '../src/logic/flavorMatcher.js';
import { sortLeaderboard } from '../src/logic/leaderboardSort.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Flavor {
  name: string;
  color: string;
  category: string;
  description: string;
}

interface CoffeeLog {
  id: string;
  userId: string;
  origin: string;
  beanName: string;
  roast: '浅烘' | '中烘' | '深烘';
  process: '水洗' | '日晒' | '蜜处理' | '厌氧';
  flavors: Flavor[];
  photoUrl: string;
  waterTemp: number;
  grindSize: string;
  brewTime: string;
  notes: string;
  likes: number;
  comments: number;
  createdAt: string;
  beanType: '浅烘水洗瑰夏' | '深烘日晒曼特宁' | '其他';
}

interface User {
  id: string;
  username: string;
  password: string;
  avatar: string;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  score: number;
  lastChallengeAt: string;
}

const users: User[] = [
  { id: '1', username: '咖啡猎人', password: '123456', avatar: 'https://i.pravatar.cc/100?img=1' },
  { id: '2', username: '手冲达人', password: '123456', avatar: 'https://i.pravatar.cc/100?img=2' },
  { id: '3', username: '风味探索者', password: '123456', avatar: 'https://i.pravatar.cc/100?img=3' },
  { id: '4', username: '深度烘焙控', password: '123456', avatar: 'https://i.pravatar.cc/100?img=4' },
  { id: '5', username: '浅焙党', password: '123456', avatar: 'https://i.pravatar.cc/100?img=5' },
  { id: '6', username: '味蕾艺术家', password: '123456', avatar: 'https://i.pravatar.cc/100?img=6' },
  { id: '7', username: '豆农之友', password: '123456', avatar: 'https://i.pravatar.cc/100?img=7' },
  { id: '8', username: '杯测师', password: '123456', avatar: 'https://i.pravatar.cc/100?img=8' },
  { id: '9', username: '单品收集者', password: '123456', avatar: 'https://i.pravatar.cc/100?img=9' },
  { id: '10', username: '咖啡因战士', password: '123456', avatar: 'https://i.pravatar.cc/100?img=10' },
  { id: '11', username: '新手小白', password: '123456', avatar: 'https://i.pravatar.cc/100?img=11' },
  { id: '12', username: '老饕', password: '123456', avatar: 'https://i.pravatar.cc/100?img=12' },
];

const flavorCategories: Record<string, Flavor[]> = {
  花香: [
    { name: '茉莉', color: '#FFF4E6', category: '花香', description: '清新优雅的茉莉花香，带有淡淡的甜感，常见于埃塞俄比亚和肯尼亚咖啡豆。' },
    { name: '玫瑰', color: '#FFE4E6', category: '花香', description: '馥郁的玫瑰花香气，层次丰富，给咖啡带来浪漫的花香体验。' },
    { name: '洋甘菊', color: '#FFF8DC', category: '花香', description: '温和的洋甘菊香气，带有草本的清新感和微甜的余韵。' },
  ],
  果香: [
    { name: '柑橘', color: '#FFE4B5', category: '果香', description: '明亮活泼的柑橘类果酸，类似柠檬、橙子的清新感，是浅烘豆的标志。' },
    { name: '莓果', color: '#FFB6C1', category: '果香', description: '草莓、蓝莓、覆盆子等混合浆果的酸甜风味，常见于水洗处理法。' },
    { name: '热带水果', color: '#FFDAB9', category: '果香', description: '芒果、菠萝、百香果等浓郁的热带水果风味，日晒处理法的典型特征。' },
    { name: '核果', color: '#FFC0CB', category: '果香', description: '桃子、杏子、李子等核果类的甜蜜风味，口感圆润饱满。' },
  ],
  坚果: [
    { name: '榛果', color: '#D2B48C', category: '坚果', description: '经典的榛果香气，带有烘烤后的焦香和奶油般的顺滑口感。' },
    { name: '杏仁', color: '#DEB887', category: '坚果', description: '清新的杏仁风味，略带苦味，与巧克力搭配绝佳。' },
    { name: '核桃', color: '#A0522D', category: '坚果', description: '深沉的核桃香，带有木质调的余韵，常见于中深烘焙。' },
  ],
  巧克力: [
    { name: '黑巧克力', color: '#8B4513', category: '巧克力', description: '浓郁的黑巧克力风味，带有微苦的可可感和醇厚的回甘。' },
    { name: '牛奶巧克力', color: '#D2691E', category: '巧克力', description: '丝滑的牛奶巧克力口感，甜度适中，大众喜爱的经典风味。' },
    { name: '可可', color: '#6B4423', category: '巧克力', description: '纯粹的可可豆香气，不添加糖的原始风味，层次感强。' },
  ],
  香料: [
    { name: '肉桂', color: '#CD853F', category: '香料', description: '温暖的肉桂香气，带有微辣的刺激感和甜美的余韵。' },
    { name: '丁香', color: '#8B0000', category: '香料', description: '强烈的丁香料香，带有木质和花香的复杂层次。' },
    { name: '黑胡椒', color: '#2F2F2F', category: '香料', description: '微妙的黑胡椒辛香，为咖啡增添独特的辛辣尾韵。' },
  ],
};

const generatePhotoUrl = (seed: number) =>
  `https://images.unsplash.com/photo-${1509042239860 + seed}-a5bb25955d2e?w=400&h=300&fit=crop`;

const allFlavors = Object.values(flavorCategories).flat();

const coffeeLogs: CoffeeLog[] = [];

const origins = ['埃塞俄比亚 耶加雪菲', '哥伦比亚 慧兰', '巴西 喜拉多', '肯尼亚 AA', '巴拿马 翡翠庄园', '印尼 苏门答腊', '危地马拉 安提瓜', '哥斯达黎加'];
const beanNames = ['瑰夏', '曼特宁', '波旁', '铁皮卡', '卡杜艾', '帕卡玛拉', '希比特', '薇拉莎奇'];
const roastLevels: Array<'浅烘' | '中烘' | '深烘'> = ['浅烘', '中烘', '深烘'];
const processes: Array<'水洗' | '日晒' | '蜜处理' | '厌氧'> = ['水洗', '日晒', '蜜处理', '厌氧'];
const grindSizes = ['极细', '细', '中细', '中', '中粗', '粗'];
const brewTimes = ['2:00', '2:30', '3:00', '3:30', '4:00', '1:45'];

for (let i = 0; i < 15; i++) {
  const roast = roastLevels[i % 3];
  const process = processes[i % 4];
  const isGeisha = roast === '浅烘' && process === '水洗' && i % 5 === 0;
  const isMandheling = roast === '深烘' && process === '日晒' && i % 4 === 1;

  const categoryKeys = Object.keys(flavorCategories);
  const selectedCategories = isGeisha
    ? ['花香', '果香']
    : isMandheling
    ? ['巧克力', '坚果', '香料']
    : categoryKeys.slice(0, 2 + (i % 3));

  const logFlavors: Flavor[] = [];
  selectedCategories.forEach((cat) => {
    const catFlavors = flavorCategories[cat];
    const count = 1 + (i % catFlavors.length);
    for (let j = 0; j < count && j < catFlavors.length; j++) {
      logFlavors.push(catFlavors[j]);
    }
  });

  coffeeLogs.push({
    id: uuidv4(),
    userId: users[i % users.length].id,
    origin: origins[i % origins.length],
    beanName: isGeisha ? '瑰夏' : isMandheling ? '曼特宁' : beanNames[i % beanNames.length],
    roast,
    process,
    flavors: logFlavors,
    photoUrl: `https://picsum.photos/seed/coffee${i}/400/300`,
    waterTemp: 88 + (i % 8),
    grindSize: grindSizes[i % grindSizes.length],
    brewTime: brewTimes[i % brewTimes.length],
    notes: isGeisha
      ? '入口花香扑鼻，柑橘酸质明亮，尾韵带有茉莉花茶的甜感，茶汤般的body，非常优雅。'
      : isMandheling
      ? '醇厚的body，黑巧克力与雪松的香气，低酸，带有草本和泥土的复杂风味，尾韵悠长。'
      : '平衡的酸质与甜度，中等body，风味层次丰富，适合日常饮用。',
    likes: Math.floor(Math.random() * 50),
    comments: Math.floor(Math.random() * 20),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    beanType: isGeisha ? '浅烘水洗瑰夏' : isMandheling ? '深烘日晒曼特宁' : '其他',
  });
}

let leaderboard: LeaderboardEntry[] = users.map((u, i) => ({
  userId: u.id,
  username: u.username,
  avatar: u.avatar,
  score: Math.floor(Math.random() * 200) + 50,
  lastChallengeAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

let currentStreaks: Record<string, number> = {};

app.get('/api/logs', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 9;
  const sorted = [...coffeeLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const start = (page - 1) * pageSize;
  const paginated = sorted.slice(start, start + pageSize);
  res.json({
    logs: paginated,
    total: sorted.length,
    hasMore: start + pageSize < sorted.length,
  });
});

app.post('/api/logs', (req, res) => {
  const log: CoffeeLog = {
    ...req.body,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    likes: 0,
    comments: 0,
  };
  coffeeLogs.unshift(log);
  res.status(201).json(log);
});

app.get('/api/challenge/random', (req, res) => {
  const geishaLogs = coffeeLogs.filter((l) => l.beanType === '浅烘水洗瑰夏');
  const mandhelingLogs = coffeeLogs.filter((l) => l.beanType === '深烘日晒曼特宁');

  if (geishaLogs.length === 0 || mandhelingLogs.length === 0) {
    return res.status(400).json({ error: '数据不足，无法生成挑战' });
  }

  const geisha = geishaLogs[Math.floor(Math.random() * geishaLogs.length)];
  const mandheling = mandhelingLogs[Math.floor(Math.random() * mandhelingLogs.length)];

  const pair = Math.random() > 0.5 ? [geisha, mandheling] : [mandheling, geisha];
  const correctAnswer = pair[0].beanType === '浅烘水洗瑰夏' ? 'A' : 'B';

  const sanitize = (log: CoffeeLog) => ({
    id: log.id,
    flavors: log.flavors,
    notes: log.notes,
    waterTemp: log.waterTemp,
    grindSize: log.grindSize,
    brewTime: log.brewTime,
  });

  res.json({
    optionA: sanitize(pair[0]),
    optionB: sanitize(pair[1]),
    correctAnswer,
  });
});

app.post('/api/challenge/guess', (req, res) => {
  const { userId, guess, correctAnswer } = req.body;
  const isCorrect = guess === correctAnswer;
  const streak = (currentStreaks[userId] || 0) + (isCorrect ? 1 : 0);
  if (!isCorrect) currentStreaks[userId] = 0;
  else currentStreaks[userId] = streak;

  const score = computeChallengeScore(isCorrect, streak);

  const entryIndex = leaderboard.findIndex((e) => e.userId === userId);
  if (entryIndex >= 0) {
    leaderboard[entryIndex].score += score;
    leaderboard[entryIndex].lastChallengeAt = new Date().toISOString();
  } else {
    const user = users.find((u) => u.id === userId) || users[0];
    leaderboard.push({
      userId,
      username: user.username,
      avatar: user.avatar,
      score,
      lastChallengeAt: new Date().toISOString(),
    });
  }

  leaderboard = sortLeaderboard(leaderboard);

  res.json({
    isCorrect,
    score,
    streak,
    totalScore: leaderboard.find((e) => e.userId === userId)?.score || score,
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(leaderboard.slice(0, 10));
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    res.json({ id: user.id, username: user.username, avatar: user.avatar });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const newUser: User = {
    id: uuidv4(),
    username,
    password,
    avatar: `https://i.pravatar.cc/100?u=${encodeURIComponent(username)}`,
  };
  users.push(newUser);
  leaderboard.push({
    userId: newUser.id,
    username: newUser.username,
    avatar: newUser.avatar,
    score: 0,
    lastChallengeAt: new Date().toISOString(),
  });
  res.status(201).json({ id: newUser.id, username: newUser.username, avatar: newUser.avatar });
});

app.get('/api/flavors', (req, res) => {
  res.json(flavorCategories);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
