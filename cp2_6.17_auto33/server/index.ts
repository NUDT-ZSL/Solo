import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

interface User {
  id: string;
  username: string;
  avatar: string;
  points: number;
  reputation: number;
  location: { lat: number; lng: number };
}

interface ExchangeRecord {
  fromUserId: string;
  toUserId: string;
  time: string;
  message: string;
}

interface Item {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  points: number;
  image: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  status: string;
  location: { lat: number; lng: number };
  exchangeHistory: ExchangeRecord[];
}

interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  fromUserId: string;
  toUserId: string;
  points: number;
  time: string;
  type: 'receive' | 'give';
}

interface ItemsData {
  items: Item[];
  transactions: Transaction[];
}

interface UsersData {
  users: User[];
  currentUserId: string;
}

const dataDir = path.join(__dirname, 'data');

function readItemsData(): ItemsData {
  const raw = fs.readFileSync(path.join(dataDir, 'items.json'), 'utf-8');
  return JSON.parse(raw);
}

function writeItemsData(data: ItemsData) {
  fs.writeFileSync(path.join(dataDir, 'items.json'), JSON.stringify(data, null, 2));
}

function readUsersData(): UsersData {
  const raw = fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8');
  return JSON.parse(raw);
}

function writeUsersData(data: UsersData) {
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(data, null, 2));
}

app.get('/api/items', (req, res) => {
  const { category, search, page = '1', limit = '20' } = req.query;
  const data = readItemsData();
  let items = data.items.filter((item) => item.status === 'available');

  if (category && category !== 'all') {
    items = items.filter((item) => item.category === category);
  }

  if (search) {
    const keyword = String(search).toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword)
    );
  }

  const pageNum = parseInt(String(page));
  const limitNum = parseInt(String(limit));
  const start = (pageNum - 1) * limitNum;
  const paginatedItems = items.slice(start, start + limitNum);

  res.json({
    items: paginatedItems,
    total: items.length,
    page: pageNum,
    limit: limitNum,
  });
});

app.get('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const data = readItemsData();
  const item = data.items.find((i) => i.id === id);

  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  res.json(item);
});

app.post('/api/items/:id/exchange', (req, res) => {
  const { id } = req.params;
  const { userId, message = '' } = req.body;

  const itemsData = readItemsData();
  const usersData = readUsersData();

  const item = itemsData.items.find((i) => i.id === id);
  if (!item) {
    return res.status(404).json({ error: '物品不存在' });
  }

  if (item.status !== 'available') {
    return res.status(400).json({ error: '物品已被交换' });
  }

  const buyer = usersData.users.find((u) => u.id === userId);
  const seller = usersData.users.find((u) => u.id === item.ownerId);

  if (!buyer) {
    return res.status(404).json({ error: '用户不存在' });
  }

  if (buyer.id === seller?.id) {
    return res.status(400).json({ error: '不能交换自己发布的物品' });
  }

  if (buyer.points < item.points) {
    return res.status(400).json({ error: '积分不足' });
  }

  const now = new Date().toISOString();

  if (buyer && seller) {
    buyer.points -= item.points;
    seller.points += item.points;
  }

  item.status = 'exchanged';
  item.exchangeHistory.push({
    fromUserId: item.ownerId,
    toUserId: userId,
    time: now,
    message,
  });

  itemsData.transactions.push({
    id: uuidv4(),
    itemId: item.id,
    itemName: item.name,
    itemImage: item.image,
    fromUserId: item.ownerId,
    toUserId: userId,
    points: item.points,
    time: now,
    type: 'receive',
  });

  writeItemsData(itemsData);
  writeUsersData(usersData);

  res.json({
    success: true,
    item,
    buyer,
  });
});

app.get('/api/users/current', (req, res) => {
  const data = readUsersData();
  const user = data.users.find((u) => u.id === data.currentUserId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const data = readUsersData();
  const user = data.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

app.get('/api/users/:id/transactions', (req, res) => {
  const { id } = req.params;
  const itemsData = readItemsData();
  const usersData = readUsersData();

  const userTransactions = itemsData.transactions
    .filter((t) => t.fromUserId === id || t.toUserId === id)
    .map((t) => {
      const isReceiver = t.toUserId === id;
      const otherUserId = isReceiver ? t.fromUserId : t.toUserId;
      const otherUser = usersData.users.find((u) => u.id === otherUserId);
      return {
        ...t,
        direction: isReceiver ? 'receive' : 'give',
        otherUserName: otherUser?.username || '未知用户',
      };
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  res.json(userTransactions);
});

app.get('/api/items/heatmap', (req, res) => {
  const data = readItemsData();
  const availableItems = data.items.filter((item) => item.status === 'available');

  const heatmapData = availableItems.map((item) => ({
    id: item.id,
    name: item.name,
    points: item.points,
    location: item.location,
  }));

  res.json(heatmapData);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
