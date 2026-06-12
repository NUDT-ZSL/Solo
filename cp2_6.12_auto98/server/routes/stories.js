import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryRun, queryGet } from '../database.js';

export function createStoriesRouter(db) {
  const router = Router();

  router.get('/:roomId', (req, res) => {
    const room = queryGet(db, 'SELECT * FROM rooms WHERE id = ?', [req.params.roomId]);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const stories = queryAll(db, 'SELECT * FROM stories WHERE roomId = ? ORDER BY "order" ASC', [req.params.roomId]);
    res.json(stories);
  });

  router.post('/:roomId', (req, res) => {
    const { content, author } = req.body;
    if (!content || !author) {
      return res.status(400).json({ error: 'content and author are required' });
    }
    if (content.length < 100 || content.length > 500) {
      return res.status(400).json({ error: 'Content must be between 100 and 500 characters' });
    }
    const room = queryGet(db, 'SELECT * FROM rooms WHERE id = ?', [req.params.roomId]);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const existing = queryAll(db, 'SELECT * FROM stories WHERE roomId = ?', [req.params.roomId]);
    const order = existing.length + 1;
    const id = uuidv4();
    queryRun(db, 'INSERT INTO stories (id, roomId, content, author, "order") VALUES (?, ?, ?, ?, ?)', [id, req.params.roomId, content, author, order]);
    const story = queryGet(db, 'SELECT * FROM stories WHERE id = ?', [id]);
    res.json(story);
  });

  return router;
}
