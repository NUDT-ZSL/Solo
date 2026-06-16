import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');

function readJSON<T>(file: string): T {
  const filePath = path.join(dataDir, file);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeJSON(file: string, data: unknown): void {
  const filePath = path.join(dataDir, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/books', (req, res) => {
  const books = readJSON<any[]>('books.json');
  const { search } = req.query;
  let result = books;
  if (search) {
    const keyword = String(search).toLowerCase();
    result = books.filter(
      (b) =>
        b.title.toLowerCase().includes(keyword) ||
        b.author.toLowerCase().includes(keyword)
    );
  }
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const books = readJSON<any[]>('books.json');
  const book = books.find((b) => b.id === req.params.id);
  if (!book) {
    res.status(404).json({ error: '图书不存在' });
    return;
  }
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const books = readJSON<any[]>('books.json');
  const newBook = {
    id: uuidv4(),
    ...req.body,
    reserveCount: 0,
    createdAt: new Date().toISOString(),
    comments: []
  };
  books.push(newBook);
  writeJSON('books.json', books);
  res.status(201).json(newBook);
});

app.post('/api/books/:id/reserve', (req, res) => {
  const { userId } = req.body;
  const books = readJSON<any[]>('books.json');
  const users = readJSON<any[]>('users.json');
  const bookIndex = books.findIndex((b) => b.id === req.params.id);
  if (bookIndex === -1) {
    res.status(404).json({ error: '图书不存在' });
    return;
  }
  const book = books[bookIndex];
  if (book.stock <= 0) {
    res.status(400).json({ error: '库存不足' });
    return;
  }
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  const user = users[userIndex];
  const activeReservations = user.reservations.filter(
    (r: any) => new Date(r.expireAt) > new Date()
  );
  if (activeReservations.length >= 2) {
    res.status(400).json({ error: '已达到预约上限（最多2本）' });
    return;
  }
  const alreadyReserved = user.reservations.some(
    (r: any) => r.bookId === book.id && new Date(r.expireAt) > new Date()
  );
  if (alreadyReserved) {
    res.status(400).json({ error: '已预约过此图书' });
    return;
  }
  books[bookIndex].stock -= 1;
  books[bookIndex].reserveCount += 1;
  const reservation = {
    id: uuidv4(),
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    createdAt: new Date().toISOString(),
    expireAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  };
  users[userIndex].reservations.push(reservation);
  users[userIndex].borrowStats.reserved += 1;
  writeJSON('books.json', books);
  writeJSON('users.json', users);
  res.json({ message: '预约成功', reservation });
});

app.post('/api/books/:id/comments', (req, res) => {
  const { userId, nickname, content } = req.body;
  if (!content || content.length > 200) {
    res.status(400).json({ error: '评论内容不能为空且不能超过200字' });
    return;
  }
  const books = readJSON<any[]>('books.json');
  const bookIndex = books.findIndex((b) => b.id === req.params.id);
  if (bookIndex === -1) {
    res.status(404).json({ error: '图书不存在' });
    return;
  }
  const comment = {
    id: uuidv4(),
    userId,
    nickname,
    content,
    createdAt: new Date().toISOString()
  };
  books[bookIndex].comments.unshift(comment);
  writeJSON('books.json', books);
  res.status(201).json(comment);
});

app.get('/api/activities', (req, res) => {
  const activities = readJSON<any[]>('activities.json');
  const now = new Date();
  const upcoming = activities
    .filter((a) => new Date(a.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  res.json(upcoming);
});

app.post('/api/activities/:id/register', (req, res) => {
  const { userId } = req.body;
  const activities = readJSON<any[]>('activities.json');
  const users = readJSON<any[]>('users.json');
  const actIndex = activities.findIndex((a) => a.id === req.params.id);
  if (actIndex === -1) {
    res.status(404).json({ error: '活动不存在' });
    return;
  }
  const activity = activities[actIndex];
  if (activity.registeredUsers.length >= activity.totalSlots) {
    res.status(400).json({ error: '活动名额已满' });
    return;
  }
  if (activity.registeredUsers.includes(userId)) {
    res.status(400).json({ error: '已报名此活动' });
    return;
  }
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  activities[actIndex].registeredUsers.push(userId);
  writeJSON('activities.json', activities);
  res.json({ message: '报名成功' });
});

app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  const users = readJSON<any[]>('users.json');
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    res.status(401).json({ error: '邮箱或密码错误' });
    return;
  }
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.post('/api/users/register', (req, res) => {
  const { nickname, email, password } = req.body;
  const users = readJSON<any[]>('users.json');
  if (users.some((u) => u.email === email)) {
    res.status(400).json({ error: '邮箱已被注册' });
    return;
  }
  const newUser = {
    id: uuidv4(),
    nickname,
    email,
    password,
    registeredAt: new Date().toISOString(),
    borrowStats: { reserved: 0, borrowed: 0, total: 0 },
    reservations: [],
    borrowed: []
  };
  users.push(newUser);
  writeJSON('users.json', users);
  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.get('/api/users/:id', (req, res) => {
  const users = readJSON<any[]>('users.json');
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
