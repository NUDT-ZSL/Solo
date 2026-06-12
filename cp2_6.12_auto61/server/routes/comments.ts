import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDb } from '../db.js';

const router = Router();

router.get('/:snippetId', (req: Request, res: Response) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM comments WHERE snippet_id = ? ORDER BY created_at DESC');
  stmt.bind([req.params.snippetId]);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  res.json(rows);
});

router.post('/:snippetId', (req: Request, res: Response) => {
  const { content, username } = req.body;
  if (!content) return res.status(400).json({ error: 'Missing content' });
  if (content.length > 200) return res.status(400).json({ error: 'Content too long' });
  const id = uuidv4();
  const name = username || '匿名';
  const db = getDb();
  db.run('INSERT INTO comments (id, snippet_id, username, content) VALUES (?, ?, ?, ?)', [id, req.params.snippetId, name, content]);
  saveDb();
  const stmt = db.prepare('SELECT * FROM comments WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const comment: any = stmt.getAsObject();
  res.status(201).json(comment);
});

router.delete('/:commentId', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.run('DELETE FROM comments WHERE id = ?', [req.params.commentId]);
  if (result.getRowsModified() === 0) return res.status(404).json({ error: 'Not found' });
  saveDb();
  res.json({ success: true });
});

export default router;
