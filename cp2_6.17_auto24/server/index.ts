import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { User, Item, Message, Station, MatchResult } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const STATIONS_FILE = path.join(DATA_DIR, 'stations.json');

const readJSON = <T>(file: string, defaultValue: T): T => {
  if (!fs.existsSync(file)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return defaultValue;
  }
};

const writeJSON = <T>(file: string, data: T) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
};

const stations: Station[] = [
  { id: 's1', name: '市中心', line: '1号线', x: 400, y: 300 },
  { id: 's2', name: '人民广场', line: '1号线', x: 280, y: 200 },
  { id: 's3', name: '火车站', line: '1号线', x: 520, y: 200 },
  { id: 's4', name: '科技园', line: '1号线', x: 640, y: 300 },
  { id: 's5', name: '大学城', line: '1号线', x: 520, y: 400 },
  { id: 's6', name: '体育馆', line: '2号线', x: 400, y: 150 },
  { id: 's7', name: '商业街', line: '2号线', x: 160, y: 300 },
  { id: 's8', name: '医院', line: '2号线', x: 280, y: 400 },
  { id: 's9', name: '公园', line: '2号线', x: 640, y: 400 },
  { id: 's10', name: '机场', line: '3号线', x: 160, y: 150 },
  { id: 's11', name: '博物馆', line: '3号线', x: 400, y: 450 },
  { id: 's12', name: '会展中心', line: '3号线', x: 760, y: 300 },
];

writeJSON(STATIONS_FILE, stations);

const lineColors: Record<string, string> = {
  '1号线': '#ef4444',
  '2号线': '#3b82f6',
  '3号线': '#10b981',
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const initData = () => {
  const users = readJSON<User[]>(USERS_FILE, []);
  if (users.length === 0) {
    const demoUsers: User[] = [
      { id: uuidv4(), username: 'demo', password: '123456', phone: '13800138000', createdAt: dayjs().toISOString() },
    ];
    writeJSON(USERS_FILE, demoUsers);
  }

  const items = readJSON<Item[]>(ITEMS_FILE, []);
  if (items.length === 0) {
    const demoUsers = readJSON<User[]>(USERS_FILE, []);
    const demoItems: Item[] = [
      {
        id: uuidv4(), type: 'lost', title: '黑色钱包',
        description: '黑色皮质钱包，内有身份证和银行卡，约300元现金',
        stationId: 's1', stationName: '市中心', location: '1号线站台',
        time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
        contact: '138****8000', imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=300&fit=crop',
        userId: demoUsers[0].id, username: 'demo', status: 'open',
        createdAt: dayjs().subtract(1, 'day').toISOString(),
        keywords: ['钱包', '黑色', '皮质', '身份证', '银行卡']
      },
      {
        id: uuidv4(), type: 'found', title: '苹果手机',
        description: '黑色iPhone 13，屏幕有轻微划痕，已关机',
        stationId: 's2', stationName: '人民广场', location: '2号线换乘通道',
        time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
        contact: '139****9000', imageUrl: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400&h=300&fit=crop',
        userId: demoUsers[0].id, username: 'demo', status: 'open',
        createdAt: dayjs().subtract(2, 'day').toISOString(),
        keywords: ['手机', '苹果', 'iPhone', '黑色']
      },
      {
        id: uuidv4(), type: 'lost', title: '蓝色双肩包',
        description: '蓝色Nike双肩包，内有笔记本电脑和书籍',
        stationId: 's3', stationName: '火车站', location: '安检口',
        time: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
        contact: '137****7000', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop',
        userId: demoUsers[0].id, username: 'demo', status: 'open',
        createdAt: dayjs().subtract(3, 'day').toISOString(),
        keywords: ['双肩包', '背包', '蓝色', '电脑', '笔记本']
      },
      {
        id: uuidv4(), type: 'found', title: '钥匙一串',
        description: '约5把钥匙，有一个小熊挂件',
        stationId: 's4', stationName: '科技园', location: 'A出口',
        time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
        contact: '136****6000', imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&h=300&fit=crop',
        userId: demoUsers[0].id, username: 'demo', status: 'open',
        createdAt: dayjs().subtract(1, 'day').toISOString(),
        keywords: ['钥匙', '挂件', '小熊']
      },
      {
        id: uuidv4(), type: 'lost', title: '雨伞',
        description: '黑色长柄雨伞，伞面有白色条纹',
        stationId: 's5', stationName: '大学城', location: '3号线站台',
        time: dayjs().subtract(4, 'day').format('YYYY-MM-DD HH:mm'),
        contact: '135****5000', imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400&h=300&fit=crop',
        userId: demoUsers[0].id, username: 'demo', status: 'open',
        createdAt: dayjs().subtract(4, 'day').toISOString(),
        keywords: ['雨伞', '阳伞', '黑色', '条纹']
      },
      {
        id: uuidv4(), type: 'found', title: '黑色钱包',
        description: '捡到黑色皮质钱包一个，内有若干现金和卡片',
        stationId: 's1', stationName: '市中心', location: '1号线座椅',
        time: dayjs().subtract(1, 'day').add(2, 'hour').format('YYYY-MM-DD HH:mm'),
        contact: '134****4000', imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=300&fit=crop',
        userId: demoUsers[0].id, username: 'demo', status: 'open',
        createdAt: dayjs().subtract(1, 'day').add(2, 'hour').toISOString(),
        keywords: ['钱包', '黑色', '皮质', '现金']
      },
      {
        id: uuidv4(), type: 'lost', title: '眼镜',
        description: '黑框近视眼镜，蓝色眼镜盒',
        stationId: 's6', stationName: '体育馆', location: 'B出口',
        time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
        contact: '133****3000', imageUrl: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=300&fit=crop',
        userId: demoUsers[0].id, username: 'demo', status: 'open',
        createdAt: dayjs().subtract(2, 'day').toISOString(),
        keywords: ['眼镜', '近视镜', '黑框', '眼镜盒']
      },
      {
        id: uuidv4(), type: 'found', title: '耳机',
        description: '白色AirPods Pro，充电盒有划痕',
        stationId: 's7', stationName: '商业街', location: '商业街入口',
        time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
        contact: '132****2000', imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=300&fit=crop',
        userId: demoUsers[0].id, username: 'demo', status: 'open',
        createdAt: dayjs().subtract(1, 'day').toISOString(),
        keywords: ['耳机', 'AirPods', '蓝牙', '白色', '苹果']
      },
    ];
    writeJSON(ITEMS_FILE, demoItems);
  }
};

initData();

app.get('/api/stations', (_req: Request, res: Response) => {
  const stations = readJSON<Station[]>(STATIONS_FILE, []);
  const items = readJSON<Item[]>(ITEMS_FILE, []);
  const stationItemCount: Record<string, number> = {};
  items.forEach(item => {
    stationItemCount[item.stationId] = (stationItemCount[item.stationId] || 0) + 1;
  });
  res.json({ stations, stationItemCount, lineColors });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password, phone } = req.body;
  if (!username || !password || !phone) {
    return res.status(400).json({ error: '请填写完整信息' });
  }
  const users = readJSON<User[]>(USERS_FILE, []);
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const newUser: User = {
    id: uuidv4(),
    username,
    password,
    phone,
    createdAt: dayjs().toISOString(),
  };
  users.push(newUser);
  writeJSON(USERS_FILE, users);
  res.json({ success: true, user: { id: newUser.id, username: newUser.username, phone: newUser.phone } });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const users = readJSON<User[]>(USERS_FILE, []);
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({ success: true, user: { id: user.id, username: user.username, phone: user.phone } });
});

app.get('/api/items', (req: Request, res: Response) => {
  const { stationId, type, page = '1', pageSize = '10' } = req.query;
  let items = readJSON<Item[]>(ITEMS_FILE, []);
  
  if (stationId) {
    items = items.filter(i => i.stationId === stationId);
  }
  if (type) {
    items = items.filter(i => i.type === type);
  }
  
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const p = parseInt(page as string);
  const ps = parseInt(pageSize as string);
  const start = (p - 1) * ps;
  const paginatedItems = items.slice(start, start + ps);
  
  res.json({ items: paginatedItems, total: items.length, hasMore: start + ps < items.length });
});

app.get('/api/items/:id', (req: Request, res: Response) => {
  const items = readJSON<Item[]>(ITEMS_FILE, []);
  const item = items.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }
  res.json(item);
});

app.post('/api/items', (req: Request, res: Response) => {
  const { type, title, description, stationId, stationName, location, time, contact, imageUrl, userId, username } = req.body;
  
  const keywords = extractKeywords(title + ' ' + description);
  
  const newItem: Item = {
    id: uuidv4(),
    type,
    title,
    description,
    stationId,
    stationName,
    location,
    time,
    contact,
    imageUrl,
    userId,
    username,
    status: 'open',
    createdAt: dayjs().toISOString(),
    keywords,
  };
  
  const items = readJSON<Item[]>(ITEMS_FILE, []);
  items.push(newItem);
  writeJSON(ITEMS_FILE, items);
  
  res.json({ success: true, item: newItem });
});

const extractKeywords = (text: string): string[] => {
  const commonWords = ['的', '是', '在', '有', '和', '了', '我', '你', '他', '她', '它', '一个', '一些', '里面', '内有'];
  const words = text.split(/[\s，。！？、；：""''（）\[\]【】.,!?;:\'\"\(\)\[\]]+/);
  return words.filter(w => w.length >= 2 && !commonWords.includes(w)).slice(0, 10);
};

const manhattanDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
};

const calculateSimilarity = (keywords1: string[], keywords2: string[]): number => {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  let matches = 0;
  keywords1.forEach(k1 => {
    keywords2.forEach(k2 => {
      if (k1 === k2 || k1.includes(k2) || k2.includes(k1)) {
        matches++;
      }
    });
  });
  return matches / Math.max(keywords1.length, keywords2.length);
};

const runMatching = () => {
  const items = readJSON<Item[]>(ITEMS_FILE, []);
  const stations = readJSON<Station[]>(STATIONS_FILE, []);
  const messages = readJSON<Message[]>(MESSAGES_FILE, []);
  
  const stationMap: Record<string, Station> = {};
  stations.forEach(s => { stationMap[s.id] = s; });
  
  const lostItems = items.filter(i => i.type === 'lost' && i.status === 'open');
  const foundItems = items.filter(i => i.type === 'found' && i.status === 'open');
  
  const newMessages: Message[] = [];
  
  lostItems.forEach(lostItem => {
    const lostStation = stationMap[lostItem.stationId];
    if (!lostStation) return;
    
    foundItems.forEach(foundItem => {
      if (lostItem.userId === foundItem.userId) return;
      
      const foundStation = stationMap[foundItem.stationId];
      if (!foundStation) return;
      
      const distance = manhattanDistance(lostStation.x, lostStation.y, foundStation.x, foundStation.y);
      const keywordSimilarity = calculateSimilarity(lostItem.keywords, foundItem.keywords);
      
      const distanceScore = Math.max(0, 1 - distance / 1000);
      const totalScore = keywordSimilarity * 0.7 + distanceScore * 0.3;
      
      const alreadyNotified = messages.some(m => 
        m.userId === lostItem.userId && 
        m.itemId === lostItem.id && 
        m.matchedItemId === foundItem.id
      );
      
      if (!alreadyNotified && totalScore > 0.3) {
        const matchType = totalScore >= 0.6 ? 'success' : 'possible';
        const messageType = matchType === 'success' ? 'match_success' : 'match_possible';
        
        newMessages.push({
          id: uuidv4(),
          type: messageType,
          userId: lostItem.userId,
          title: matchType === 'success' ? '找到高度匹配的物品！' : '发现可能匹配的物品',
          content: `您发布的"${lostItem.title}"与拾获的"${foundItem.title}"匹配度${Math.round(totalScore * 100)}%`,
          itemId: lostItem.id,
          matchedItemId: foundItem.id,
          read: false,
          createdAt: dayjs().toISOString(),
        });
        
        newMessages.push({
          id: uuidv4(),
          type: messageType,
          userId: foundItem.userId,
          title: matchType === 'success' ? '找到高度匹配的失主！' : '发现可能匹配的失主',
          content: `您拾获的"${foundItem.title}"与丢失的"${lostItem.title}"匹配度${Math.round(totalScore * 100)}%`,
          itemId: foundItem.id,
          matchedItemId: lostItem.id,
          read: false,
          createdAt: dayjs().toISOString(),
        });
      }
    });
  });
  
  if (newMessages.length > 0) {
    const allMessages = [...messages, ...newMessages];
    writeJSON(MESSAGES_FILE, allMessages);
  }
  
  return newMessages.length;
};

setInterval(() => {
  const count = runMatching();
  console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 匹配任务执行完成，生成 ${count} 条新消息`);
}, 60000);

app.post('/api/matching/run', (_req: Request, res: Response) => {
  const count = runMatching();
  res.json({ success: true, newMessageCount: count });
});

app.get('/api/messages', (req: Request, res: Response) => {
  const { userId } = req.query;
  let messages = readJSON<Message[]>(MESSAGES_FILE, []);
  
  if (userId) {
    messages = messages.filter(m => m.userId === userId);
  }
  
  messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json(messages);
});

app.put('/api/messages/:id/read', (req: Request, res: Response) => {
  const messages = readJSON<Message[]>(MESSAGES_FILE, []);
  const index = messages.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '消息不存在' });
  }
  messages[index].read = true;
  writeJSON(MESSAGES_FILE, messages);
  res.json({ success: true });
});

app.put('/api/messages/read-all', (req: Request, res: Response) => {
  const { userId } = req.body;
  const messages = readJSON<Message[]>(MESSAGES_FILE, []);
  messages.forEach(m => {
    if (m.userId === userId) {
      m.read = true;
    }
  });
  writeJSON(MESSAGES_FILE, messages);
  res.json({ success: true });
});

app.put('/api/items/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  const items = readJSON<Item[]>(ITEMS_FILE, []);
  const index = items.findIndex(i => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '物品不存在' });
  }
  items[index].status = status;
  writeJSON(ITEMS_FILE, items);
  res.json({ success: true });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  runMatching();
});
