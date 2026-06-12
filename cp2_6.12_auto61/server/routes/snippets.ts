import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const snippets = db.prepare('SELECT * FROM snippets ORDER BY created_at DESC').all();
  res.json(snippets.map((s: any) => ({ ...s, tags: JSON.parse(s.tags) })));
});

router.get('/:id', (req: Request, res: Response) => {
  const snippet = db.prepare('SELECT * FROM snippets WHERE id = ?').get(req.params.id);
  if (!snippet) return res.status(404).json({ error: 'Not found' });
  res.json({ ...snippet, tags: JSON.parse((snippet as any).tags) });
});

router.post('/', (req: Request, res: Response) => {
  const { title, language, code, tags } = req.body;
  if (!title || !language || !code) return res.status(400).json({ error: 'Missing fields' });
  const id = uuidv4();
  const tagsJson = JSON.stringify(tags || []);
  db.prepare('INSERT INTO snippets (id, title, language, code, tags) VALUES (?, ?, ?, ?, ?)').run(id, title, language, code, tagsJson);
  const snippet = db.prepare('SELECT * FROM snippets WHERE id = ?').get(id);
  res.status(201).json({ ...(snippet as any), tags: JSON.parse((snippet as any).tags) });
});

router.put('/:id', (req: Request, res: Response) => {
  const { title, language, code, tags } = req.body;
  const tagsJson = JSON.stringify(tags || []);
  const result = db.prepare('UPDATE snippets SET title = ?, language = ?, code = ?, tags = ? WHERE id = ?').run(title, language, code, tagsJson, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  const snippet = db.prepare('SELECT * FROM snippets WHERE id = ?').get(req.params.id);
  res.json({ ...(snippet as any), tags: JSON.parse((snippet as any).tags) });
});

router.delete('/:id', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM snippets WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

export default router;
