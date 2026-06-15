import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

function success<T>(data: T): ApiResponse<T> {
  return { code: 200, data, message: 'ok' };
}

function error(message: string, code: number = 500): ApiResponse<null> {
  return { code, data: null, message };
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

app.get('/api/works', (req, res) => {
  const works = db.prepare('SELECT * FROM works ORDER BY createdAt DESC').all();
  res.json(success(works));
});

app.post('/api/works', (req, res) => {
  const { title, description, coverImage, category } = req.body;
  if (!title || !description || !coverImage || !category) {
    return res.status(400).json(error('缺少必要字段', 400));
  }
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO works (id, title, description, coverImage, category, createdAt, viewCount) VALUES (?, ?, ?, ?, ?, ?, 0)'
  ).run(id, title, description, coverImage, category, createdAt);
  const work = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
  res.status(201).json(success(work));
});

app.put('/api/works/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, coverImage, category } = req.body;
  const existing = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json(error('作品不存在', 404));
  }
  const newTitle = title ?? (existing as any).title;
  const newDescription = description ?? (existing as any).description;
  const newCoverImage = coverImage ?? (existing as any).coverImage;
  const newCategory = category ?? (existing as any).category;
  db.prepare(
    'UPDATE works SET title = ?, description = ?, coverImage = ?, category = ? WHERE id = ?'
  ).run(newTitle, newDescription, newCoverImage, newCategory, id);
  const work = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
  res.json(success(work));
});

app.delete('/api/works/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM works WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json(error('作品不存在', 404));
  }
  res.json(success(null));
});

app.get('/api/works/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE works SET viewCount = viewCount + 1 WHERE id = ?').run(id);
  const work = db.prepare('SELECT * FROM works WHERE id = ?').get(id);
  if (!work) {
    return res.status(404).json(error('作品不存在', 404));
  }
  res.json(success(work));
});

app.get('/api/comments/:workId', (req, res) => {
  const { workId } = req.params;
  const comments = db.prepare(
    'SELECT * FROM comments WHERE workId = ? ORDER BY createdAt DESC'
  ).all(workId);
  res.json(success(comments));
});

app.post('/api/comments', (req, res) => {
  const { workId, nickname, content } = req.body;
  if (!workId || !nickname || !content) {
    return res.status(400).json(error('缺少必要字段', 400));
  }
  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(workId);
  if (!work) {
    return res.status(404).json(error('作品不存在', 404));
  }
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO comments (id, workId, nickname, content, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, workId, nickname, content, createdAt);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  res.status(201).json(success(comment));
});

app.get('/api/stats', (req, res) => {
  const totalVisitsRow = db.prepare('SELECT count FROM visits WHERE id = 1').get() as { count: number } | undefined;
  const totalVisits = totalVisitsRow?.count ?? 0;

  const today = getTodayDate();
  const todayRow = db.prepare('SELECT count FROM daily_visits WHERE date = ?').get(today) as { count: number } | undefined;
  const todayVisits = todayRow?.count ?? 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const trend: { date: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const row = db.prepare('SELECT count FROM daily_visits WHERE date = ?').get(dateStr) as { count: number } | undefined;
    trend.push({ date: dateStr, count: row?.count ?? 0 });
  }

  const topWorks = db.prepare(`
    SELECT 
      w.*,
      COUNT(c.id) as commentCount,
      (w.viewCount + COUNT(c.id) * 2) as hotScore
    FROM works w
    LEFT JOIN comments c ON w.id = c.workId
    GROUP BY w.id
    ORDER BY hotScore DESC
    LIMIT 5
  `).all();

  res.json(success({
    totalVisits,
    todayVisits,
    visitTrend: trend,
    topWorks
  }));
});

app.post('/api/visit', (req, res) => {
  db.prepare('UPDATE visits SET count = count + 1 WHERE id = 1').run();

  const today = getTodayDate();
  const existing = db.prepare('SELECT count FROM daily_visits WHERE date = ?').get(today) as { count: number } | undefined;
  if (existing) {
    db.prepare('UPDATE daily_visits SET count = count + 1 WHERE date = ?').run(today);
  } else {
    db.prepare('INSERT INTO daily_visits (date, count) VALUES (?, 1)').run(today);
  }

  res.json(success({ success: true }));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
