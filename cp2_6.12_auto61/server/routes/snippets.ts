import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, saveDb } from '../db.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM snippets ORDER BY created_at DESC');
  const snippets = stmt.getAsObject() as any[];
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  res.json(rows.map((s: any) => ({ ...s, tags: JSON.parse(s.tags) })));
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM snippets WHERE id = ?');
  stmt.bind([req.params.id]);
  if (!stmt.step()) return res.status(404).json({ error: 'Not found' });
  const snippet: any = stmt.getAsObject();
  res.json({ ...snippet, tags: JSON.parse(snippet.tags) });
});

router.post('/', (req: Request, res: Response) => {
  const { title, language, code, tags } = req.body;
  if (!title || !language || !code) return res.status(400).json({ error: 'Missing fields' });
  const id = uuidv4();
  const tagsJson = JSON.stringify(tags || []);
  const db = getDb();
  db.run('INSERT INTO snippets (id, title, language, code, tags) VALUES (?, ?, ?, ?, ?)', [id, title, language, code, tagsJson]);
  saveDb();
  const stmt = db.prepare('SELECT * FROM snippets WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const snippet: any = stmt.getAsObject();
  res.status(201).json({ ...snippet, tags: JSON.parse(snippet.tags) });
});

router.put('/:id', (req: Request, res: Response) => {
  const { title, language, code, tags } = req.body;
  const tagsJson = JSON.stringify(tags || []);
  const db = getDb();
  const result = db.run('UPDATE snippets SET title = ?, language = ?, code = ?, tags = ? WHERE id = ?', [title, language, code, tagsJson, req.params.id]);
  if (result.getRowsModified() === 0) return res.status(404).json({ error: 'Not found' });
  saveDb();
  const stmt = db.prepare('SELECT * FROM snippets WHERE id = ?');
  stmt.bind([req.params.id]);
  stmt.step();
  const snippet: any = stmt.getAsObject();
  res.json({ ...snippet, tags: JSON.parse(snippet.tags) });
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.run('DELETE FROM snippets WHERE id = ?', [req.params.id]);
  if (result.getRowsModified() === 0) return res.status(404).json({ error: 'Not found' });
  saveDb();
  res.json({ success: true });
});

export default router;
