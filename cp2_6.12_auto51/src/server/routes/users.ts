import { Router, Request, Response } from 'express';
import db from '../db';
import { checkAndAwardBadges, BadgeRecord } from '../services/badgeService';

const router = Router();

interface User {
  id: string;
  name: string;
  avatar: string | null;
  totalHours: number;
}

interface Activity {
  id: string;
  userId: string;
  date: string;
  hours: number;
  description: string | null;
  createdAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function validateBase64Avatar(avatar: string): { valid: boolean; error?: string } {
  const base64JpgRegex = /^data:image\/jpeg;base64,/;
  const base64PngRegex = /^data:image\/png;base64,/;

  if (!base64JpgRegex.test(avatar) && !base64PngRegex.test(avatar)) {
    return { valid: false, error: '头像格式必须为JPG或PNG的base64编码' };
  }

  const base64Data = avatar.replace(/^data:image\/(jpeg|png);base64,/, '');
  const estimatedSize = (base64Data.length * 3) / 4;
  const maxSize = 2 * 1024 * 1024;

  if (estimatedSize > maxSize) {
    return { valid: false, error: '头像大小不能超过2MB' };
  }

  return { valid: true };
}

router.post('/register', (req: Request, res: Response): void => {
  const { name, avatar } = req.body as { name?: string; avatar?: string };

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: '姓名不能为空' });
    return;
  }

  if (avatar && typeof avatar === 'string') {
    const avatarValidation = validateBase64Avatar(avatar);
    if (!avatarValidation.valid) {
      res.status(400).json({ error: avatarValidation.error });
      return;
    }
  }

  const userId = generateId();
  const trimmedName = name.trim();
  const avatarValue = avatar && typeof avatar === 'string' ? avatar : null;

  const insertStmt = db.prepare(
    'INSERT INTO users (id, name, avatar, totalHours) VALUES (?, ?, ?, 0)'
  );
  insertStmt.run(userId, trimmedName, avatarValue);

  const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = userStmt.get(userId) as User;

  res.status(201).json(user);
});

router.post('/:userId/checkin', (req: Request, res: Response): void => {
  const { userId } = req.params;
  const { hours, date, description } = req.body as {
    hours?: number;
    date?: string;
    description?: string;
  };

  const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = userStmt.get(userId) as User | undefined;

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  if (typeof hours !== 'number' || isNaN(hours)) {
    res.status(400).json({ error: '工时必须为有效数字' });
    return;
  }

  if (hours <= 0 || hours > 12) {
    res.status(400).json({ error: '工时必须在0.5到12小时之间' });
    return;
  }

  if (hours * 2 !== Math.floor(hours * 2)) {
    res.status(400).json({ error: '工时必须是0.5的倍数' });
    return;
  }

  if (!date || typeof date !== 'string' || !isValidDate(date)) {
    res.status(400).json({ error: '无效的日期格式' });
    return;
  }

  if (description && typeof description === 'string' && description.length > 100) {
    res.status(400).json({ error: '描述不能超过100个字符' });
    return;
  }

  const tx = db.transaction(() => {
    const activityId = generateId();
    const createdAt = new Date().toISOString();
    const descriptionValue = description && typeof description === 'string' ? description : null;

    const insertActivityStmt = db.prepare(
      'INSERT INTO activities (id, userId, date, hours, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertActivityStmt.run(activityId, userId, date, hours, descriptionValue, createdAt);

    const updateUserStmt = db.prepare('UPDATE users SET totalHours = totalHours + ? WHERE id = ?');
    updateUserStmt.run(hours, userId);

    const newBadges = checkAndAwardBadges(userId);

    const updatedUser = userStmt.get(userId) as User;
    const activityStmt = db.prepare('SELECT * FROM activities WHERE id = ?');
    const activity = activityStmt.get(activityId) as Activity;

    return { activity, user: updatedUser, newBadges };
  });

  try {
    const result = tx();
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: '打卡失败，请重试' });
  }
});

router.get('/:userId', (req: Request, res: Response): void => {
  const { userId } = req.params;

  const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = userStmt.get(userId) as User | undefined;

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  res.json(user);
});

router.get('/:userId/activities', (req: Request, res: Response): void => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const offset = (safePage - 1) * safeLimit;

  const userStmt = db.prepare('SELECT id FROM users WHERE id = ?');
  const user = userStmt.get(userId) as { id: string } | undefined;

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM activities WHERE userId = ?');
  const totalResult = countStmt.get(userId) as { count: number };
  const total = totalResult.count;

  const activitiesStmt = db.prepare(
    'SELECT * FROM activities WHERE userId = ? ORDER BY date DESC, createdAt DESC LIMIT ? OFFSET ?'
  );
  const activities = activitiesStmt.all(userId, safeLimit, offset) as Activity[];

  res.json({
    data: activities,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit)
    }
  });
});

router.get('/', (_req: Request, res: Response): void => {
  const stmt = db.prepare('SELECT * FROM users ORDER BY totalHours DESC');
  const users = stmt.all() as User[];
  res.json(users);
});

export default router;
