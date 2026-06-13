import express from 'express';
import cors from 'cors';
import { db, User, Book, ReadingStatus, Vote, VoteRecord, Activity, ReadingLog } from './db.js';

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

app.get('/api/users', async (req, res) => {
  const users = await db.users.find<User>({});
  res.json(users.map((u) => ({ id: u._id, username: u.username, avatar: u.avatar, isAdmin: u.isAdmin })));
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
  const userIds = statuses.map((s) => s.userId);
  const allUsers = await db.users.find<User>({});
  const userMap = new Map(allUsers.map((u) => [u._id, u]));
  const seen = new Set(userIds);
  const memberStatuses = statuses.map((s) => ({
    userId: s.userId,
    username: userMap.get(s.userId)?.username || '未知',
    avatar: userMap.get(s.userId)?.avatar || '',
    status: s.status,
    note: s.note,
    updatedAt: s.updatedAt,
  }));
  allUsers.forEach((u) => {
    if (!seen.has(u._id!)) {
      memberStatuses.push({
        userId: u._id!,
        username: u.username,
        avatar: u.avatar,
        status: 'unread',
        note: '',
        updatedAt: 0,
      });
    }
  });
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
  if (status === 'read' && existing?.status !== 'read') {
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

app.get('/api/reading-status/me/:userId', async (req, res) => {
  const statuses = await db.readingStatuses.find<ReadingStatus>({ userId: req.params.userId });
  res.json(statuses);
});

app.get('/api/votes/active', async (req, res) => {
  const now = Date.now();
  const allVotes = await db.votes.find<Vote>({});
  let activeVote = allVotes.find((v) => !v.closed && v.endsAt > now) || null;
  if (!activeVote && allVotes.length > 0) {
    activeVote = allVotes.sort((a, b) => b.createdAt - a.createdAt)[0];
  }
  if (!activeVote) return res.json(null);
  const books = await db.books.find<Book>({ _id: { $in: activeVote.bookIds } });
  const records = await db.voteRecords.find<VoteRecord>({ voteId: activeVote._id });
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
  const userVoteMap: Record<string, string> = {};
  records.forEach((r) => {
    userVoteMap[r.userId] = r.bookId;
  });
  res.json({ ...activeVote, books, counts, result, total, userVoteMap });
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
  const vote = await db.votes.findOne<Vote>({ _id: req.params.id });
  const book = await db.books.findOne<Book>({ _id: bookId });
  const user = await db.users.findOne<User>({ _id: userId });
  if (vote && book && user) {
    const activity: Activity = {
      type: 'vote_book',
      userId,
      username: user.username,
      avatar: user.avatar,
      bookId: book._id,
      bookTitle: book.title,
      createdAt: Date.now(),
    };
    await db.activities.insert(activity);
    emitActivity(activity);
  }
  res.json({ ok: true });
});

app.get('/api/votes/:id/result', async (req, res) => {
  const vote = await db.votes.findOne<Vote>({ _id: req.params.id });
  if (!vote) return res.status(404).json({ error: '投票不存在' });
  const books = await db.books.find<Book>({ _id: { $in: vote.bookIds } });
  const records = await db.voteRecords.find<VoteRecord>({ voteId: req.params.id });
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.bookId] = (counts[r.bookId] || 0) + 1;
  });
  const total = records.length;
  const result = books.map((b) => ({
    book: b,
    count: counts[b._id!] || 0,
    percent: total ? ((counts[b._id!] || 0) / total) * 100 : 0,
  })).sort((a, b) => b.count - a.count);
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

app.post('/api/announcements', async (req, res) => {
  const { userId, username, avatar, content } = req.body;
  const activity: Activity = {
    type: 'announcement',
    userId,
    username,
    avatar,
    content,
    createdAt: Date.now(),
  };
  const doc = await db.activities.insert(activity);
  emitActivity(activity);
  res.json(doc);
});

app.get('/api/reading-calendar/:userId', async (req, res) => {
  const { userId } = req.params;
  const days = 365;
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  const startStr = start.toISOString().split('T')[0];
  const logs = await db.readingLogs.find<ReadingLog>({
    userId,
    date: { $gte: startStr },
  });
  const dayMap: Record<string, { minutes: number; pages: number }> = {};
  logs.forEach((l) => {
    dayMap[l.date] = { minutes: l.minutes, pages: l.pages };
  });
  const cal: Record<string, { minutes: number; pages: number; intensity: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const item = dayMap[key] || { minutes: 0, pages: 0 };
    let intensity = 0;
    if (item.minutes > 0) {
      if (item.minutes < 15) intensity = 1;
      else if (item.minutes < 30) intensity = 2;
      else if (item.minutes < 60) intensity = 3;
      else intensity = 4;
    }
    cal[key] = { minutes: item.minutes, pages: item.pages, intensity };
  }
  res.json(cal);
});

app.get('/api/reading-logs/:userId', async (req, res) => {
  const logs = await db.readingLogs.find<ReadingLog>({ userId: req.params.userId }).sort({ date: 1 });
  res.json(logs);
});

app.get('/api/reading-trend/:userId', async (req, res) => {
  const { userId } = req.params;
  const days = 30;
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  const startStr = start.toISOString().split('T')[0];
  const logs = await db.readingLogs.find<ReadingLog>({
    userId,
    date: { $gte: startStr },
  });
  const dayMap: Record<string, { minutes: number; pages: number }> = {};
  logs.forEach((l) => {
    dayMap[l.date] = { minutes: l.minutes, pages: l.pages };
  });
  const trend: { date: string; minutes: number; pages: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const item = dayMap[key] || { minutes: 0, pages: 0 };
    trend.push({ date: key, minutes: item.minutes, pages: item.pages });
  }
  res.json(trend);
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
  const userMinutes: Record<string, number> = {};
  logs.forEach((l) => {
    userPages[l.userId] = (userPages[l.userId] || 0) + l.pages;
    userMinutes[l.userId] = (userMinutes[l.userId] || 0) + l.minutes;
  });
  const users = await db.users.find<User>({});
  const board = users
    .map((u, idx) => ({
      rank: idx + 1,
      userId: u._id,
      username: u.username,
      avatar: u.avatar,
      pages: userPages[u._id!] || 0,
      minutes: userMinutes[u._id!] || 0,
      medal: '' as '' | 'gold' | 'silver' | 'bronze',
    }))
    .sort((a, b) => b.pages - a.pages)
    .map((item, idx) => {
      const rank = idx + 1;
      let medal: '' | 'gold' | 'silver' | 'bronze' = '';
      if (rank === 1) medal = 'gold';
      else if (rank === 2) medal = 'silver';
      else if (rank === 3) medal = 'bronze';
      return { ...item, rank, medal };
    });
  const totalBooks = await db.books.count({});
  const totalPages = board.reduce((s, x) => s + x.pages, 0);
  res.json({
    board,
    stats: {
      members: users.length,
      books: totalBooks,
      totalPages,
    },
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`ReadCircle API server running on http://localhost:${PORT}`);
});
