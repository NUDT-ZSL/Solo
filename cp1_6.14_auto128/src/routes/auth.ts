import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import type { User } from '../types.js';

const router = Router();
const JWT_SECRET = 'peergrad-secret-key';

const users: User[] = [
  {
    id: 'teacher-1',
    email: 'teacher@peergrad.com',
    password: 'teacher123',
    nickname: '张老师',
    role: 'teacher',
  },
  {
    id: 'student-1',
    email: 'student1@peergrad.com',
    password: 'student123',
    nickname: '小明',
    role: 'student',
  },
  {
    id: 'student-2',
    email: 'student2@peergrad.com',
    password: 'student123',
    nickname: '小红',
    role: 'student',
  },
  {
    id: 'student-3',
    email: 'student3@peergrad.com',
    password: 'student123',
    nickname: '小华',
    role: 'student',
  },
];

router.post('/register', (req, res) => {
  const { email, password, nickname, role } = req.body;

  if (!email || !password || !nickname) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(400).json({ error: '该邮箱已注册' });
  }

  const user: User = {
    id: uuidv4(),
    email,
    password,
    nickname,
    role: role || 'student',
  };

  users.push(user);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    },
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '请输入邮箱和密码' });
  }

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    },
  });
});

export default router;
