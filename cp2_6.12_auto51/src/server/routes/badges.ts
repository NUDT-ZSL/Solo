import { Router, Request, Response } from 'express';
import db from '../db';
import { checkAndAwardBadges, getBadgesByUserId, BadgeRecord } from '../services/badgeService';

const router = Router();

router.get('/:userId', (req: Request, res: Response): void => {
  const { userId } = req.params;

  const userStmt = db.prepare('SELECT id FROM users WHERE id = ?');
  const user = userStmt.get(userId) as { id: string } | undefined;

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const badges = getBadgesByUserId(userId);
  res.json(badges);
});

router.post('/:userId/check', (req: Request, res: Response): void => {
  const { userId } = req.params;

  const userStmt = db.prepare('SELECT id FROM users WHERE id = ?');
  const user = userStmt.get(userId) as { id: string } | undefined;

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const newBadges: BadgeRecord[] = checkAndAwardBadges(userId);

  res.json({
    newBadges,
    message: newBadges.length > 0 ? `获得 ${newBadges.length} 个新徽章` : '没有新徽章'
  });
});

export default router;
