import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';
import { getUserById } from './users';

const router = Router();

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const stories = db.prepare(`
    SELECT s.id, s.title, s.createdAt, s.inviteCode,
      (SELECT COUNT(*) FROM story_nodes WHERE storyId = s.id) AS nodeCount,
      (SELECT COUNT(DISTINCT authorId) FROM story_nodes WHERE storyId = s.id) AS contributorCount,
      (SELECT content FROM story_nodes WHERE storyId = s.id ORDER BY createdAt DESC LIMIT 1) AS latestSummary
    FROM stories s
    ORDER BY s.createdAt DESC
  `).all();
  res.json(stories);
});

router.post('/', (req: Request, res: Response) => {
  const { title, content, userId } = req.body;
  if (!title || !content || !userId) {
    res.status(400).json({ error: 'title, content, and userId are required' });
    return;
  }
  const user = getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const db = getDb();
  const id = uuidv4();
  const inviteCode = generateInviteCode();
  const now = new Date().toISOString();
  const nodeId = uuidv4();

  const insertStory = db.prepare(`
    INSERT INTO stories (id, title, inviteCode, createdAt) VALUES (?, ?, ?, ?)
  `);
  const insertNode = db.prepare(`
    INSERT INTO story_nodes (id, storyId, parentId, content, imageUrl, authorId, generation, positionX, positionY, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertStory.run(id, title, inviteCode, now);
    insertNode.run(nodeId, id, null, content, null, userId, 0, 400, 500, now);
  });

  transaction();

  res.status(201).json({ id, title, inviteCode, createdAt: now, rootNodeId: nodeId });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) {
    res.status(404).json({ error: 'Story not found' });
    return;
  }
  const nodes = db.prepare('SELECT * FROM story_nodes WHERE storyId = ? ORDER BY generation, createdAt').all(req.params.id);
  res.json({ ...story, nodes });
});

router.post('/:id/nodes', (req: Request, res: Response) => {
  const { parentId, content, imageUrl, userId } = req.body;
  if (!parentId || !content || !userId) {
    res.status(400).json({ error: 'parentId, content, and userId are required' });
    return;
  }
  const user = getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) {
    res.status(404).json({ error: 'Story not found' });
    return;
  }
  const parentNode = db.prepare('SELECT * FROM story_nodes WHERE id = ? AND storyId = ?').get(parentId, req.params.id) as {
    generation: number; positionX: number; positionY: number;
  } | undefined;
  if (!parentNode) {
    res.status(404).json({ error: 'Parent node not found' });
    return;
  }

  const id = uuidv4();
  const generation = parentNode.generation + 1;

  const siblingCount = db.prepare(
    'SELECT COUNT(*) AS count FROM story_nodes WHERE parentId = ?'
  ).get(parentId) as { count: number };

  const angleDeg = 45 * (siblingCount.count + 1);
  const angleRad = (angleDeg * Math.PI) / 180;
  const offset = 120;
  const positionX = Math.round(parentNode.positionX + offset * Math.cos(angleRad));
  const positionY = Math.round(parentNode.positionY - offset * Math.sin(angleRad));
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO story_nodes (id, storyId, parentId, content, imageUrl, authorId, generation, positionX, positionY, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, parentId, content, imageUrl ?? null, userId, generation, positionX, positionY, now);

  const node = db.prepare('SELECT * FROM story_nodes WHERE id = ?').get(id);
  res.status(201).json(node);
});

export default router;
