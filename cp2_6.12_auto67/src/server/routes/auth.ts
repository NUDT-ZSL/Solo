import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database';
import { JWT_SECRET } from '../middleware/auth';

const router = Router();

router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const createdAt = Date.now();
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  db.prepare(`
    INSERT INTO users (id, username, password, avatar, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, username, hashedPassword, avatar, createdAt);

  const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: {
      id,
      username,
      avatar,
    },
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user) {
    return res.status(400).json({ error: '用户名或密码错误' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ error: '用户名或密码错误' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    },
  });
});

export default router;
