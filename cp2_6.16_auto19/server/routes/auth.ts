import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { run, get } from '../db.js';

const router = Router();

function generateToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

function parseToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');
    return userId || null;
  } catch {
    return null;
  }
}

router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, email, password, latitude, longitude } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
    }

    const existingUser = get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const id = uuidv4();

    run(
      'INSERT INTO users (id, username, email, password_hash, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, email, passwordHash, latitude || null, longitude || null]
    );

    const user = get('SELECT id, username, email, latitude, longitude, reputation, created_at FROM users WHERE id = ?', [id]);
    const token = generateToken(id);

    res.json({ user, token });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const { password_hash, ...userWithoutPassword } = user;
    const token = generateToken(user.id);

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export { router as authRouter, parseToken };
