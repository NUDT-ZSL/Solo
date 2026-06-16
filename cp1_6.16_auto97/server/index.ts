import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

type RoastLevel = 'light' | 'medium' | 'dark';
type ProcessMethod = 'washed' | 'natural' | 'honey';
type TargetType = 'gesha' | 'mandheling';

interface User {
  id: string;
  username: string;
  avatar: string;
  score: number;
  lastChallengeTime: number;
  password?: string;
}

interface CoffeeLog {
  id: string;
  userId: string;
  origin: string;
  roastLevel: RoastLevel;
  processMethod: ProcessMethod;
  flavors: string[];
  photoUrl?: string;
  waterTemp?: number;
  grindSize?: string;
  brewTime?: number;
  note?: string;
  likes: number;
  comments: number;
  createdAt: number;
  isChallengeTarget?: boolean;
  targetType?: TargetType;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;
}

const avatars = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=CoffeeLover',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=BeanMaster',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=RoastKing',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=BrewQueen',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=AromaSeeker',
];

const users: User[] = [
  { id: 'u1', username: '咖啡品鉴师', avatar: avatars[0], score: 125, lastChallengeTime: Date.now() - 3600000, password: '123456' },
  { id: 'u2', username: '豆豆达人', avatar: avatars[1], score: 98, lastChallengeTime: Date.now() - 7200000, password: '123456' },
  { id: 'u3', username: '手冲小王子', avatar: avatars[2], score: 87, lastChallengeTime: Date.now() - 10800000, password: '123456' },
  { id: 'u4', username: '风味猎人', avatar: avatars[3], score: 76, lastChallengeTime: Date.now() - 14400000, password: '123456' },
  { id: 'u5', username: '慢时光咖啡', avatar: avatars[4], score: 65, lastChallengeTime: Date.now() - 18000000, password: '123456' },
  { id: 'u6', username: '新手小白', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Newbie', score: 30, lastChallengeTime: Date.now() - 86400000, password: '123456' },
  { id: 'u7', username: '浅烘爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LightRoast', score: 110, lastChallengeTime: Date.now() - 5000000, password: '123456' },
  { id: 'u8', username: '深烘控', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DarkRoast', score: 55, lastChallengeTime: Date.now() - 20000000, password: '123456' },
];

let currentUserId = 'u1';

const coffeeLogs: CoffeeLog[] = [
  {
    id: 'l1',
    userId: 'u1',
    origin: '埃塞俄比亚 耶加雪菲 科契尔',
    roastLevel: 'light',
    processMethod: 'washed',
    flavors: ['jasmine', 'lemon', 'orange', 'peach', 'earl-grey'],
    photoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    waterTemp: 92,
    grindSize: '中细研磨',
    brewTime: 150,
    note: '明亮的柑橘酸质，茉莉花香明显，尾韵带有伯爵茶的回甘。',
    likes: 24,
    comments: 5,
    createdAt: Date.now() - 86400000,
    isChallengeTarget: true,
    targetType: 'gesha',
  },
  {
    id: 'l2',
    userId: 'u2',
    origin: '印尼 苏门答腊 曼特宁',
    roastLevel: 'dark',
    processMethod: 'natural',
    flavors: ['dark-chocolate', 'cocoa', 'walnut', 'cinnamon', 'pepper'],
    photoUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400',
    waterTemp: 94,
    grindSize: '中粗研磨',
    brewTime: 180,
    note: '醇厚的草本气息，黑巧克力和核桃的厚重感，低酸浓郁。',
    likes: 18,
    comments: 3,
    createdAt: Date.now() - 172800000,
    isChallengeTarget: true,
    targetType: 'mandheling',
  },
  {
    id: 'l3',
    userId: 'u3',
    origin: '哥伦比亚 慧兰',
    roastLevel: 'medium',
    processMethod: 'washed',
    flavors: ['berry', 'grape', 'milk-chocolate', 'almond', 'caramel'],
    photoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    waterTemp: 93,
    grindSize: '中研磨',
    brewTime: 165,
    note: '平衡的莓果酸和巧克力甜感，坚果尾韵悠长。',
    likes: 31,
    comments: 8,
    createdAt: Date.now() - 259200000,
  },
  {
    id: 'l4',
    userId: 'u1',
    origin: '巴拿马 翡翠庄园 瑰夏',
    roastLevel: 'light',
    processMethod: 'washed',
    flavors: ['jasmine', 'rose', 'peach', 'pineapple', 'lemon', 'earl-grey'],
    photoUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400',
    waterTemp: 91,
    grindSize: '中细研磨',
    brewTime: 145,
    note: '经典瑰夏风味，浓郁的花香和热带水果，层次丰富。',
    likes: 56,
    comments: 12,
    createdAt: Date.now() - 345600000,
    isChallengeTarget: true,
    targetType: 'gesha',
  },
  {
    id: 'l5',
    userId: 'u4',
    origin: '肯尼亚 AA',
    roastLevel: 'medium',
    processMethod: 'washed',
    flavors: ['berry', 'lemon', 'grape', 'blackcurrant', 'tomato'],
    photoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400',
    waterTemp: 92,
    grindSize: '中细研磨',
    brewTime: 155,
    note: '强烈的黑醋栗酸，类似番茄的复杂果酸，非常有个性。',
    likes: 22,
    comments: 4,
    createdAt: Date.now() - 432000000,
  },
  {
    id: 'l6',
    userId: 'u2',
    origin: '巴西 喜拉多',
    roastLevel: 'medium',
    processMethod: 'natural',
    flavors: ['milk-chocolate', 'almond', 'peanut', 'caramel', 'hazelnut'],
    photoUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
    waterTemp: 93,
    grindSize: '中研磨',
    brewTime: 170,
    note: '经典巴西风味，坚果巧克力为主，低酸醇厚，适合做意式基底。',
    likes: 15,
    comments: 2,
    createdAt: Date.now() - 518400000,
  },
  {
    id: 'l7',
    userId: 'u5',
    origin: '曼特宁 林东',
    roastLevel: 'dark',
    processMethod: 'natural',
    flavors: ['dark-chocolate', 'cocoa', 'walnut', 'hazelnut', 'clove', 'cinnamon'],
    photoUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400',
    waterTemp: 95,
    grindSize: '粗研磨',
    brewTime: 190,
    note: '浓郁的泥土和烟熏气息，黑巧克力尾韵，厚实顺滑。',
    likes: 19,
    comments: 3,
    createdAt: Date.now() - 604800000,
    isChallengeTarget: true,
    targetType: 'mandheling',
  },
  {
    id: 'l8',
    userId: 'u3',
    origin: '哥斯达黎加 蜜处理',
    roastLevel: 'light',
    processMethod: 'honey',
    flavors: ['peach', 'berry', 'orange', 'milk-chocolate', 'almond'],
    photoUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
    waterTemp: 92,
    grindSize: '中细研磨',
    brewTime: 160,
    note: '蜜处理特有的圆润甜感，水蜜桃和莓果交织，非常讨喜。',
    likes: 28,
    comments: 6,
    createdAt: Date.now() - 691200000,
  },
];

const app = express();
app.use(cors());
app.use(express.json());

function sortLeaderboard(usersList: User[]): LeaderboardEntry[] {
  const sorted = [...usersList].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.lastChallengeTime - a.lastChallengeTime;
  });

  return sorted.slice(0, 10).map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    score: user.score,
  }));
}

function computeChallengeScore(isCorrect: boolean, streak: number): number {
  if (!isCorrect) return 0;
  return 10 + (streak >= 1 ? 5 : 0);
}

app.get('/api/logs', (_req: Request, res: Response) => {
  const sorted = [...coffeeLogs].sort((a, b) => b.createdAt - a.createdAt);
  res.json(sorted);
});

app.post('/api/logs', (req: Request, res: Response) => {
  const body = req.body as Partial<CoffeeLog>;
  const newLog: CoffeeLog = {
    id: uuidv4(),
    userId: currentUserId,
    origin: body.origin || '未知产地',
    roastLevel: body.roastLevel || 'medium',
    processMethod: body.processMethod || 'washed',
    flavors: body.flavors || [],
    photoUrl: body.photoUrl,
    waterTemp: body.waterTemp,
    grindSize: body.grindSize,
    brewTime: body.brewTime,
    note: body.note,
    likes: 0,
    comments: 0,
    createdAt: Date.now(),
  };
  coffeeLogs.unshift(newLog);
  res.status(201).json(newLog);
});

app.get('/api/challenge/random', (_req: Request, res: Response) => {
  const geshaLogs = coffeeLogs.filter(l => l.targetType === 'gesha');
  const mandhelingLogs = coffeeLogs.filter(l => l.targetType === 'mandheling');

  if (geshaLogs.length === 0 || mandhelingLogs.length === 0) {
    return res.status(400).json({ error: 'Not enough challenge data' });
  }

  const gesha = geshaLogs[Math.floor(Math.random() * geshaLogs.length)];
  const mandheling = mandhelingLogs[Math.floor(Math.random() * mandhelingLogs.length)];

  const useAFirst = Math.random() > 0.5;
  const optionA = useAFirst ? gesha : mandheling;
  const optionB = useAFirst ? mandheling : gesha;
  const correctAnswer: 'A' | 'B' = useAFirst ? 'A' : 'B';

  const stripInfo = (log: CoffeeLog): CoffeeLog => ({
    ...log,
    origin: '???',
    isChallengeTarget: undefined,
    targetType: undefined,
  });

  res.json({
    optionA: stripInfo(optionA),
    optionB: stripInfo(optionB),
    correctAnswer,
  });
});

app.post('/api/challenge/guess', (req: Request, res: Response) => {
  const { answer, correctAnswer, streak, userId } = req.body as {
    answer: 'A' | 'B';
    correctAnswer: 'A' | 'B';
    streak: number;
    userId?: string;
  };

  const isCorrect = answer === correctAnswer;
  const newStreak = isCorrect ? streak + 1 : 0;
  const score = computeChallengeScore(isCorrect, streak);

  const uid = userId || currentUserId;
  const user = users.find(u => u.id === uid);
  if (user) {
    user.score += score;
    user.lastChallengeTime = Date.now();
  }

  res.json({ isCorrect, score, newStreak });
});

app.get('/api/leaderboard', (_req: Request, res: Response) => {
  res.json(sortLeaderboard(users));
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    currentUserId = user.id;
    const { password: _p, ...safeUser } = user;
    return res.json(safeUser);
  }
  res.status(401).json({ error: '用户名或密码错误' });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const newUser: User = {
    id: uuidv4(),
    username,
    password,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
    score: 0,
    lastChallengeTime: Date.now(),
  };
  users.push(newUser);
  currentUserId = newUser.id;
  const { password: _p, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.get('/api/user/current', (_req: Request, res: Response) => {
  const user = users.find(u => u.id === currentUserId);
  if (user) {
    const { password: _p, ...safeUser } = user;
    return res.json(safeUser);
  }
  res.status(404).json({ error: 'No user logged in' });
});

app.get('/api/user/logs/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const userLogs = coffeeLogs
    .filter(l => l.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(userLogs);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[豆录] Express server running on http://localhost:${PORT}`);
});
