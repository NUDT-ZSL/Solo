import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mockWorks } from './mockData.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const works = JSON.parse(JSON.stringify(mockWorks));

app.get('/api/works', (_req, res) => {
  const list = works.map(({ comments, ...rest }) => rest);
  res.json(list);
});

app.get('/api/works/:id', (req, res) => {
  const work = works.find((w: any) => w.id === req.params.id);
  if (!work) {
    return res.status(404).json({ error: 'Work not found' });
  }
  res.json(work);
});

app.get('/api/mock-data', (_req, res) => {
  res.json(works);
});

app.post('/api/works/:id/vote', (req, res) => {
  const work = works.find((w: any) => w.id === req.params.id);
  if (!work) {
    return res.status(404).json({ error: 'Work not found' });
  }
  work.votes += 1;
  res.json({ votes: work.votes });
});

app.post('/api/works/:id/comments', (req, res) => {
  const work = works.find((w: any) => w.id === req.params.id);
  if (!work) {
    return res.status(404).json({ error: 'Work not found' });
  }
  const { username, content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be empty' });
  }
  const newComment = {
    id: uuidv4(),
    username: username || '匿名用户',
    content: content.trim(),
    timestamp: new Date().toISOString(),
  };
  work.comments.unshift(newComment);
  res.json(newComment);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
