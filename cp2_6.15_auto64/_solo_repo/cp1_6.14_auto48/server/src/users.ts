import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';

const COLORS = [
  '#e17055', '#d63031', '#fd79a8', '#e84393', '#6c5ce7',
  '#0984e3', '#00b894', '#00cec9', '#fdcb6e', '#e17055',
  '#fab1a0', '#74b9ff', '#a29bfe', '#55efc4', '#ffeaa7',
  '#dfe6e9', '#b2bec3', '#636e72', '#2d3436', '#ff7675',
];

export function createUser(nickname: string, storyId: string) {
  const db = getDb();
  const id = uuidv4();
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO users (id, nickname, color, storyId, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, nickname, color, storyId, createdAt);
  return { id, nickname, color, storyId, createdAt };
}

export function getUserById(id: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as {
    id: string; nickname: string; color: string; storyId: string; createdAt: string;
  } | undefined;
}

export const usersRouter = Router();

usersRouter.post('/', (req, res) => {
  const { nickname, inviteCode } = req.body;
  if (!nickname || typeof nickname !== 'string' || nickname.length < 2 || nickname.length > 10) {
    return res.status(400).json({ error: 'Nickname must be 2-10 characters' });
  }
  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required' });
  }
  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE inviteCode = ?').get(inviteCode) as { id: string } | undefined;
  if (!story) {
    return res.status(404).json({ error: 'Story not found' });
  }
  const user = createUser(nickname, story.id);
  res.json({ user, token: user.id });
});

usersRouter.get('/:id', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

usersRouter.get('/stories/:storyId/contributors', (req, res) => {
  const db = getDb();
  const contributors = db.prepare(`
    SELECT u.id, u.nickname, u.color, u.storyId, u.createdAt,
           COUNT(n.id) as nodeCount,
           COALESCE(MAX(n.generation), 0) as generation
    FROM users u
    LEFT JOIN story_nodes n ON n.authorId = u.id
    WHERE u.storyId = ?
    GROUP BY u.id
  `).all(req.params.storyId);
  res.json({ contributors });
});

usersRouter.get('/stories/:storyId/timeline', (req, res) => {
  const db = getDb();
  const events = db.prepare(`
    SELECT DATE(n.createdAt) as date, COUNT(n.id) as nodeCount
    FROM story_nodes n
    WHERE n.storyId = ?
    GROUP BY DATE(n.createdAt)
    ORDER BY date ASC
  `).all(req.params.storyId) as { date: string; nodeCount: number }[];
  const timeline = events.map((row, i) => ({
    date: row.date,
    description: `${row.date} 有 ${row.nodeCount} 个更新`,
    nodeCount: row.nodeCount,
    index: i,
  }));
  res.json({ events: timeline });
});
