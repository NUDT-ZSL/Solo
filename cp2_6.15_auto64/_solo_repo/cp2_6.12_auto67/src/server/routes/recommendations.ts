import { Router } from 'express';
import db from '../database';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/popular', authMiddleware, (req: AuthRequest, res) => {
  const popular = db.prepare(`
    SELECT c.*, 
           u.username as user_name,
           COUNT(r.id) as review_count,
           AVG(c.rating) as avg_rating
    FROM collections c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN reviews r ON r.collection_id = c.id
    GROUP BY c.id
    ORDER BY review_count DESC, avg_rating DESC
    LIMIT 5
  `).all();

  res.json(popular);
});

router.get('/similar-users', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const userCollections = db.prepare(`
    SELECT title, type FROM collections WHERE user_id = ?
  `).all(userId) as { title: string; type: string }[];

  if (userCollections.length === 0) {
    return res.json([]);
  }

  const allUsers = db.prepare(`
    SELECT u.id, u.username, u.avatar,
           COUNT(c.id) as collection_count
    FROM users u
    JOIN collections c ON c.user_id = u.id
    WHERE u.id != ?
    GROUP BY u.id
    ORDER BY collection_count DESC
    LIMIT 20
  `).all(userId);

  const similarUsers = (allUsers as any[]).map((user: any) => {
    const userCols = db.prepare(`
      SELECT title, type FROM collections WHERE user_id = ?
    `).all(user.id) as { title: string; type: string }[];

    const matchCount = userCollections.filter(
      uc => userCols.some(c => c.title === uc.title && c.type === uc.type)
    ).length;

    const similarity = userCollections.length > 0 ? matchCount / userCollections.length : 0;

    return {
      ...user,
      similarity: Math.round(similarity * 100),
      matchCount,
    };
  }).sort((a, b) => b.similarity - a.similarity).slice(0, 3);

  res.json(similarUsers);
});

router.get('/user/:userId/collections', authMiddleware, (req: AuthRequest, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 16;
  const offset = (page - 1) * limit;

  const user = db.prepare('SELECT id, username, avatar, created_at FROM users WHERE id = ?').get(userId);
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

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
    user,
    data: collections,
    pagination: {
      page,
      limit,
      total: total.count,
      hasMore: offset + limit < total.count,
    },
  });
});

export default router;
