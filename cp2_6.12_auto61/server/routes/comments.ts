import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

router.get('/:snippetId', (req: Request, res: Response) => {
  const comments = db.prepare('SELECT * FROM comments WHERE snippet_id = ? ORDER BY created_at DESC').all(req.params.snippetId);
  res.json(comments);
});

router.post('/:snippetId', (req: Request, res: Response) => {
  const { content, username } = req.body;
  if (!content) return res.status(400).json({ error: 'Missing content' });
  if (content.length > 200) return res.status(400).json({ error: 'Content too long' });
  const id = uuidv4();
  const name = username || '匿名';
  db.prepare('INSERT INTO comments (id, snippet_id, username, content) VALUES (?, ?, ?, ?)').run(id, req.params.snippetId, name, content);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
  res.status(201).json(comment);
});

router.delete('/:commentId', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.commentId);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

export default router;
