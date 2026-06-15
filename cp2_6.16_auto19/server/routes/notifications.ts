import { Router, Request, Response } from 'express';
import { all, get, run } from '../db.js';

const router = Router();

router.get('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const notifications = all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const parsedNotifications = notifications.map(n => ({
      ...n,
      is_read: n.is_read === 1
    }));

    res.json({ notifications: parsedNotifications });
  } catch (error) {
    console.error('获取通知列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = get('SELECT * FROM notifications WHERE id = ?', [id]);
    if (!notification) {
      return res.status(404).json({ error: '通知不存在' });
    }

    run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);

    const updated = get('SELECT * FROM notifications WHERE id = ?', [id]);
    res.json({ notification: { ...updated, is_read: updated.is_read === 1 } });
  } catch (error) {
    console.error('标记已读错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:userId/unread-count', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({ unreadCount: result?.count || 0 });
  } catch (error) {
    console.error('获取未读数量错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export { router as notificationsRouter };
