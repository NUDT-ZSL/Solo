import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/:collectionId', authMiddleware, (req: AuthRequest, res) => {
  const { collectionId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const reviews = db.prepare(`
    SELECT r.*, u.username as user_name, u.avatar as user_avatar
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.collection_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(collectionId, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE collection_id = ?').get(collectionId) as { count: number };

  res.json({
    data: reviews.map((r: any) => ({
      ...r,
      emotions: JSON.parse(r.emotions),
    })),
    pagination: {
      page,
      limit,
      total: total.count,
      hasMore: offset + limit < total.count,
    },
  });
});

router.post('/', authMiddleware, (req: AuthRequest, res) => {
  const { collectionId, content, emotions } = req.body;
  const userId = req.user!.id;

  if (!collectionId || !content) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  if (content.length > 500) {
    return res.status(400).json({ error: '评价内容不能超过500字' });
  }

  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);
  if (!collection) {
    return res.status(404).json({ error: '收藏不存在' });
  }

  const id = uuidv4();
  const createdAt = Date.now();
  const emotionsStr = JSON.stringify(emotions || []);

  db.prepare(`
    INSERT INTO reviews (id, collection_id, user_id, content, emotions, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, collectionId, userId, content, emotionsStr, createdAt);

  const review = db.prepare(`
    SELECT r.*, u.username as user_name, u.avatar as user_avatar
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(id);

  res.status(201).json({
    ...review,
    emotions: JSON.parse((review as any).emotions),
  });
});

router.delete('/:id', authMiddleware, (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!review) {
    return res.status(404).json({ error: '评价不存在' });
  }

  if ((review as any).user_id !== userId) {
    return res.status(403).json({ error: '无权限删除' });
  }

  db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
