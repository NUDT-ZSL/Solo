import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'data.json');

app.use(cors());
app.use(express.json());

interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  name: string;
  createdAt: string;
}

interface Event {
  id: string;
  name: string;
  dateTime: string;
  location: string;
  totalStalls: number;
  pricePerStall: number;
  createdAt: string;
}

interface Stall {
  id: string;
  eventId: string;
  number: string;
  price: number;
  status: 'available' | 'booked';
  userId: string | null;
}

interface Transaction {
  id: string;
  eventId: string;
  stallId: string;
  stallNumber: string;
  userId: string;
  userEmail: string;
  amount: number;
  createdAt: string;
}

interface Feedback {
  id: string;
  eventId: string;
  userId: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Data {
  users: User[];
  events: Event[];
  stalls: Stall[];
  transactions: Transaction[];
  feedbacks: Feedback[];
}

const readData = (): Data => {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
};

const writeData = (data: Data) => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
};

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码不少于6位' });
  }

  const data = readData();
  if (data.users.find((u) => u.email === email)) {
    return res.status(400).json({ error: '该邮箱已被注册' });
  }

  const user: User = {
    id: uuidv4(),
    email,
    password,
    role: 'user',
    name,
    createdAt: new Date().toISOString(),
  };

  data.users.push(user);
  writeData(data);

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '请填写邮箱和密码' });
  }

  const data = readData();
  const user = data.users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.get('/api/events', (req: Request, res: Response) => {
  const data = readData();
  const eventsWithStats = data.events.map((event) => {
    const eventStalls = data.stalls.filter((s) => s.eventId === event.id);
    const bookedCount = eventStalls.filter((s) => s.status === 'booked').length;
    return { ...event, bookedStalls: bookedCount };
  });
  res.json(eventsWithStats);
});

app.get('/api/events/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = readData();
  const event = data.events.find((e) => e.id === id);
  if (!event) {
    return res.status(404).json({ error: '活动不存在' });
  }
  const eventStalls = data.stalls.filter((s) => s.eventId === id);
  const bookedCount = eventStalls.filter((s) => s.status === 'booked').length;
  const eventFeedbacks = data.feedbacks.filter((f) => f.eventId === id);
  res.json({ ...event, bookedStalls: bookedCount, stalls: eventStalls, feedbacks: eventFeedbacks });
});

app.post('/api/events', (req: Request, res: Response) => {
  const { name, dateTime, location, totalStalls, pricePerStall } = req.body;

  if (!name || !dateTime || !location || !totalStalls || !pricePerStall) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  const data = readData();
  const eventId = uuidv4();

  const event: Event = {
    id: eventId,
    name,
    dateTime,
    location,
    totalStalls,
    pricePerStall,
    createdAt: new Date().toISOString(),
  };

  const stalls: Stall[] = [];
  for (let i = 1; i <= totalStalls; i++) {
    const letter = String.fromCharCode(64 + Math.ceil(i / 20) || 65);
    const num = String(i % 20 || 20).padStart(2, '0');
    stalls.push({
      id: uuidv4(),
      eventId,
      number: `${letter}${num}`,
      price: pricePerStall,
      status: 'available',
      userId: null,
    });
  }

  data.events.push(event);
  data.stalls.push(...stalls);
  writeData(data);

  res.json({ ...event, stalls });
});

app.get('/api/events/:id/stalls', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = readData();
  const stalls = data.stalls.filter((s) => s.eventId === id);
  res.json(stalls);
});

app.post('/api/stalls/:id/book', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: '请先登录' });
  }

  const data = readData();
  const stall = data.stalls.find((s) => s.id === id);

  if (!stall) {
    return res.status(404).json({ error: '摊位不存在' });
  }

  if (stall.status === 'booked') {
    return res.status(400).json({ error: '该摊位已被预订' });
  }

  const user = data.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  stall.status = 'booked';
  stall.userId = userId;

  const transaction: Transaction = {
    id: uuidv4(),
    eventId: stall.eventId,
    stallId: stall.id,
    stallNumber: stall.number,
    userId,
    userEmail: user.email,
    amount: stall.price,
    createdAt: new Date().toISOString(),
  };

  data.transactions.push(transaction);
  writeData(data);

  res.json({ stall, transaction });
});

app.get('/api/users/:userId/stalls', (req: Request, res: Response) => {
  const { userId } = req.params;
  const data = readData();
  const userStalls = data.stalls.filter((s) => s.userId === userId);
  const stallsWithEvents = userStalls.map((stall) => {
    const event = data.events.find((e) => e.id === stall.eventId);
    return { ...stall, event };
  });
  res.json(stallsWithEvents);
});

app.get('/api/transactions', (req: Request, res: Response) => {
  const { eventId } = req.query;
  const data = readData();
  let transactions = [...data.transactions];

  if (eventId && eventId !== 'all') {
    transactions = transactions.filter((t) => t.eventId === eventId);
  }

  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(transactions);
});

app.get('/api/transactions/export', (req: Request, res: Response) => {
  const { eventId } = req.query;
  const data = readData();
  let transactions = [...data.transactions];
  let eventName = '所有活动';

  if (eventId && eventId !== 'all') {
    transactions = transactions.filter((t) => t.eventId === eventId);
    const event = data.events.find((e) => e.id === eventId);
    if (event) eventName = event.name;
  }

  const headers = ['摊位编号', '用户邮箱', '交易时间', '金额(元)'];
  const rows = transactions.map((t) => [
    t.stallNumber,
    t.userEmail,
    dayjs(t.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    String(t.amount),
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const bom = '\uFEFF';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="transactions_${eventName}.csv"`);
  res.send(bom + csvContent);
});

app.post('/api/feedbacks', (req: Request, res: Response) => {
  const { eventId, userId, rating, comment } = req.body;

  if (!eventId || !userId || !rating) {
    return res.status(400).json({ error: '请填写必填字段' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }

  if (comment && comment.length > 200) {
    return res.status(400).json({ error: '点评不能超过200字' });
  }

  const data = readData();
  const user = data.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const feedback: Feedback = {
    id: uuidv4(),
    eventId,
    userId,
    userEmail: user.email,
    rating,
    comment: comment || '',
    createdAt: new Date().toISOString(),
  };

  data.feedbacks.push(feedback);
  writeData(data);

  res.json(feedback);
});

app.get('/api/events/:id/feedbacks', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = readData();
  const feedbacks = data.feedbacks
    .filter((f) => f.eventId === id)
    .sort((a, b) => b.rating - a.rating);
  res.json(feedbacks);
});

app.get('/api/feedbacks/export', (req: Request, res: Response) => {
  const { eventId } = req.query;
  const data = readData();
  let feedbacks = [...data.feedbacks];
  let eventName = '所有活动';

  if (eventId && eventId !== 'all') {
    feedbacks = feedbacks.filter((f) => f.eventId === eventId);
    const event = data.events.find((e) => e.id === eventId);
    if (event) eventName = event.name;
  }

  feedbacks.sort((a, b) => b.rating - a.rating);

  const headers = ['用户邮箱', '评分', '点评', '提交时间'];
  const rows = feedbacks.map((f) => [
    f.userEmail,
    String(f.rating),
    `"${f.comment.replace(/"/g, '""')}"`,
    dayjs(f.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const bom = '\uFEFF';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="feedbacks_${eventName}.csv"`);
  res.send(bom + csvContent);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
