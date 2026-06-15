import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 16;
  const offset = (page - 1) * limit;

  const collections = db.prepare(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM reviews r WHERE r.collection_id = c.id) as review_count
    FROM collections c
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM collections WHERE user_id = ?').get(userId) as { count: number };

  res.json({
    data: collections,
    pagination: {
      page,
      limit,
      total: total.count,
      hasMore: offset + limit < total.count,
    },
  });
});

router.post('/', authMiddleware, (req: AuthRequest, res) => {
  const { title, type, creator, coverUrl, rating } = req.body;
  const userId = req.user!.id;

  if (!title || !type || !creator || !rating) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  if (!['book', 'movie', 'music'].includes(type)) {
    return res.status(400).json({ error: '无效的类型' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' });
  }

  const id = uuidv4();
  const createdAt = Date.now();

  db.prepare(`
    INSERT INTO collections (id, user_id, title, type, creator, cover_url, rating, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, title, type, creator, coverUrl || null, rating, createdAt);

  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  res.status(201).json(collection);
});

router.get('/:id', authMiddleware, (req: AuthRequest, res) => {
  const { id } = req.params;

  const collection = db.prepare(`
    SELECT c.*, u.username as user_name,
           (SELECT COUNT(*) FROM reviews r WHERE r.collection_id = c.id) as review_count
    FROM collections c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(id);

  if (!collection) {
    return res.status(404).json({ error: '收藏不存在' });
  }

  res.json(collection);
});

router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);
  if (!collection) {
    return res.status(404).json({ error: '收藏不存在' });
  }

  if (collection.user_id !== userId) {
    return res.status(403).json({ error: '无权限删除' });
  }

  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
