import { Request, Response, NextFunction, Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db.js';

const JWT_SECRET = 'copyright_platform_secret_key_2024';
const JWT_EXPIRES_IN = '7d';

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录，请先登录' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export function generateToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: '密码长度至少6位' });
    return;
  }

  const db = getDb();
  db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) {
      res.status(500).json({ error: '服务器错误' });
      return;
    }
    if (row) {
      res.status(409).json({ error: '用户名已存在' });
      return;
    }

    try {
      const id = uuidv4();
      const passwordHash = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
        [id, username, passwordHash],
        (err2) => {
          if (err2) {
            res.status(500).json({ error: '注册失败' });
            return;
          }
          const token = generateToken(id, username);
          res.json({ token, userId: id, username });
        }
      );
    } catch {
      res.status(500).json({ error: '注册失败' });
    }
  });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const db = getDb();
  db.get('SELECT id, username, password_hash FROM users WHERE username = ?', [username], async (err, row: any) => {
    if (err) {
      res.status(500).json({ error: '服务器错误' });
      return;
    }
    if (!row) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    try {
      const match = await bcrypt.compare(password, row.password_hash);
      if (!match) {
        res.status(401).json({ error: '用户名或密码错误' });
        return;
      }
      const token = generateToken(row.id, row.username);
      res.json({ token, userId: row.id, username: row.username });
    } catch {
      res.status(500).json({ error: '登录失败' });
    }
  });
});

router.get('/verify', verifyToken, (req: AuthRequest, res: Response): void => {
  res.json({ userId: req.userId, username: req.username });
});

export const authRouter = router;
