import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db, User, Book, ReadingStatus, Vote, Activity, ReadingLog } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

let listeners: ((data: Activity) => void)[] = [];

const emitActivity = (activity: Activity) => {
  listeners.forEach((fn) => {
    try {
      fn(activity);
    } catch (e) {}
  });
};

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.users.findOne<User>({ username, password });
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  res.json({ id: user._id, username: user.username, avatar: user.avatar, isAdmin: user.isAdmin });
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const exists = await db.users.findOne<User>({ username });
  if (exists) return res.status(400).json({ error: '用户名已存在' });
  const user = await db.users.insert({
    username,
    password,
    avatar: `https://i.pravatar.cc/100?u=${encodeURIComponent(username)}`,
    isAdmin: false,
    createdAt: Date.now(),
  } as User);
  res.json({ id: user._id, username: user.username, avatar: user.avatar, isAdmin: user.isAdmin });
});

app.get('/api/books', async (req, res) => {
  const { q } = req.query;
  let query = {};
  if (q && typeof q === 'string' && q.trim()) {
    const reg = new RegExp(q.trim(), 'i');
    query = { $or: [{ title: reg }, { author: reg }] };
  }
  const books = await db.books.find<Book>(query).sort({ addedAt: -1 });
  res.json(books);
});

app.get('/api/books/:id', async (req, res) => {
  const book = await db.books.findOne<Book>({ _id: req.params.id });
  if (!book) return res.status(404).json({ error: '图书不存在' });
  const statuses = await db.readingStatuses.find<ReadingStatus>({ bookId: req.params.id });
  const users = await db.users.find<User>({ _id: { $in: statuses.map((s) => s.userId) } });
  const userMap = new Map(users.map((u) => [u._id, u]));
  const memberStatuses = statuses.map((s) => ({
    userId: s.userId,
    username: userMap.get(s.userId)?.username || '未知',
    avatar: userMap.get(s.userId)?.avatar || '',
    status: s.status,
    note: s.note,
    updatedAt: s.updatedAt,
  }));
  res.json({ ...book, memberStatuses });
});

app.post('/api/books', async (req, res) => {
  const book = await db.books.insert({
    ...req.body,
    cover: req.body.cover || `https://picsum.photos/seed/${encodeURIComponent(req.body.title)}/200/300`,
    addedAt: Date.now(),
  } as Book);
  const activity: Activity = {
    type: 'add_book',
    userId: req.body.userId,
    username: req.body.username,
    avatar: req.body.avatar,
    bookId: book._id,
    bookTitle: book.title,
    createdAt: Date.now(),
  };
  await db.activities.insert(activity);
  emitActivity(activity);
  res.json(book);
});

app.put('/api/reading-status', async (req, res) => {
  const { userId, bookId, status, note, username, avatar } = req.body;
  const existing = await db.readingStatuses.findOne<ReadingStatus>({ userId, bookId });
  if (existing) {
    await db.readingStatuses.update({ _id: existing._id }, { $set: { status, note, updatedAt: Date.now() } });
  } else {
    await db.readingStatuses.insert({ userId, bookId, status, note, updatedAt: Date.now() } as ReadingStatus);
  }
  if (status === 'read') {
    const book = await db.books.findOne<Book>({ _id: bookId });
    const activity: Activity = {
      type: 'complete_book',
      userId,
      username,
      avatar,
      bookId,
      bookTitle: book?.title,
      createdAt: Date.now(),
    };
    await db.activities.insert(activity);
    emitActivity(activity);
  }
  res.json({ ok: true });
});

app.get('/api/votes/active', async (req, res) => {
  const now = Date.now();
  const activeVote = await db.votes.findOne<Vote>({ $and: [{ closed: false }, { endsAt: { $gt: now } }] });
  if (!activeVote) return res.json(null);
  const books = await db.books.find<Book>({ _id: { $in: activeVote.bookIds } });
  const records = await db.voteRecords.find({ voteId: activeVote._id });
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.bookId] = (counts[r.bookId] || 0) + 1;
  });
  res.json({ ...activeVote, books, counts, total: records.length });
});

app.post('/api/votes', async (req, res) => {
  const { title, bookIds, userId, username, avatar } = req.body;
  const vote = await db.votes.insert({
    title,
    bookIds,
    createdAt: Date.now(),
    endsAt: Date.now() + 72 * 60 * 60 * 1000,
    closed: false,
  } as Vote);
  const activity: Activity = {
    type: 'new_vote',
    userId,
    username,
    avatar,
    content: `发起了投票：${title}`,
    createdAt: Date.now(),
  };
  await db.activities.insert(activity);
  emitActivity(activity);
  res.json(vote);
});

app.post('/api/votes/:id/vote', async (req, res) => {
  const { userId, bookId } = req.body;
  const existing = await db.voteRecords.findOne({ voteId: req.params.id, userId });
  if (existing) return res.status(400).json({ error: '您已投过票' });
  await db.voteRecords.insert({ voteId: req.params.id, userId, bookId, createdAt: Date.now() });
  res.json({ ok: true });
});

app.get('/api/votes/:id/result', async (req, res) => {
  const vote = await db.votes.findOne<Vote>({ _id: req.params.id });
  if (!vote) return res.status(404).json({ error: '投票不存在' });
  const books = await db.books.find<Book>({ _id: { $in: vote.bookIds } });
  const records = await db.voteRecords.find({ voteId: req.params.id });
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.bookId] = (counts[r.bookId] || 0) + 1;
  });
  const total = records.length;
  const result = books.map((b) => ({
    book: b,
    count: counts[b._id!] || 0,
    percent: total ? ((counts[b._id!] || 0) / total) * 100 : 0,
  }));
  res.json({ vote, result, total });
});

app.get('/api/activities', async (req, res) => {
  const activities = await db.activities.find<Activity>({}).sort({ createdAt: -1 }).limit(20);
  res.json(activities);
});

app.get('/api/activities/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const fn = (data: Activity) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  listeners.push(fn);
  req.on('close', () => {
    listeners = listeners.filter((l) => l !== fn);
  });
});

app.get('/api/reading-logs/:userId', async (req, res) => {
  const logs = await db.readingLogs.find<ReadingLog>({ userId: req.params.userId }).sort({ date: 1 });
  res.json(logs);
});

app.post('/api/reading-logs', async (req, res) => {
  const { userId, date, pages, minutes, note } = req.body;
  const existing = await db.readingLogs.findOne<ReadingLog>({ userId, date });
  if (existing) {
    await db.readingLogs.update({ _id: existing._id }, { $set: { pages, minutes, note } });
    res.json({ ...existing, pages, minutes, note });
  } else {
    const log = await db.readingLogs.insert({ userId, date, pages, minutes, note, createdAt: Date.now() } as ReadingLog);
    res.json(log);
  }
});

app.get('/api/leaderboard', async (req, res) => {
  const logs = await db.readingLogs.find<ReadingLog>({});
  const userPages: Record<string, number> = {};
  logs.forEach((l) => {
    userPages[l.userId] = (userPages[l.userId] || 0) + l.pages;
  });
  const users = await db.users.find<User>({});
  const board = users
    .map((u) => ({
      userId: u._id,
      username: u.username,
      avatar: u.avatar,
      pages: userPages[u._id!] || 0,
    }))
    .sort((a, b) => b.pages - a.pages);
  res.json(board);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`ReadCircle API server running on http://localhost:${PORT}`);
});
