import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import lettersRouter from './routes/letters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;
const JWT_SECRET = 'echo-mailbox-secret-key-2024';

app.use(cors());
app.use(express.json());

const users = [];
const letters = [];
let letterIdCounter = 1;

app.post('/api/auth/register', (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const existing = users.find(u => u.username === username);
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = {
    id: users.length + 1,
    username,
    password: hashedPassword,
    nickname: nickname || username,
  };
  users.push(user);
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname } });
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'token无效' });
  }
};

app.get('/api/letters', (req, res) => {
  const publicLetters = letters
    .filter(l => l.isPublic)
    .map(l => {
      const isUnlocked = new Date(l.unlockAt) <= new Date();
      return {
        ...l,
        content: isUnlocked ? l.content : l.content.slice(0, 20) + '...',
        isUnlocked,
        likes: l.likes.length,
        hasLiked: false,
        comments: l.comments.map(c => ({ id: c.id, content: c.content, nickname: c.nickname, createdAt: c.createdAt })),
      };
    });
  res.json(publicLetters);
});

app.get('/api/letters/:id', (req, res) => {
  const letter = letters.find(l => l.id === parseInt(req.params.id));
  if (!letter) {
    return res.status(404).json({ error: '信件不存在' });
  }
  if (!letter.isPublic) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ error: '无权查看私密信件' });
    }
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      if (letter.authorId !== decoded.id) {
        return res.status(403).json({ error: '无权查看此信件' });
      }
    } catch {
      return res.status(401).json({ error: 'token无效' });
    }
  }
  const isUnlocked = new Date(letter.unlockAt) <= new Date();
  const authHeader = req.headers.authorization;
  let hasLiked = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      hasLiked = letter.likes.includes(decoded.id);
    } catch {}
  }
  res.json({
    ...letter,
    content: isUnlocked ? letter.content : letter.content.slice(0, 20) + '...',
    isUnlocked,
    likes: letter.likes.length,
    hasLiked,
    comments: letter.comments.map(c => ({ id: c.id, content: c.content, nickname: c.nickname, createdAt: c.createdAt })),
  });
});

app.post('/api/letters', authMiddleware, (req, res) => {
  const { title, content, recipientNickname, unlockAt, isPublic } = req.body;
  if (!title || !content || !unlockAt) {
    return res.status(400).json({ error: '标题、内容和解锁时间不能为空' });
  }
  const unlockDate = new Date(unlockAt);
  if (unlockDate <= new Date()) {
    return res.status(400).json({ error: '解锁时间必须在未来' });
  }
  const letter = {
    id: letterIdCounter++,
    title,
    content,
    recipientNickname: recipientNickname || '未来的自己',
    unlockAt: unlockDate.toISOString(),
    isPublic: isPublic !== false,
    authorId: req.user.id,
    authorNickname: users.find(u => u.id === req.user.id)?.nickname || req.user.username,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
  };
  letters.push(letter);
  res.status(201).json(letter);
});

app.post('/api/letters/:id/like', authMiddleware, (req, res) => {
  const letter = letters.find(l => l.id === parseInt(req.params.id));
  if (!letter) {
    return res.status(404).json({ error: '信件不存在' });
  }
  const userId = req.user.id;
  const idx = letter.likes.indexOf(userId);
  if (idx > -1) {
    letter.likes.splice(idx, 1);
  } else {
    letter.likes.push(userId);
  }
  res.json({ likes: letter.likes.length, hasLiked: letter.likes.includes(userId) });
});

app.post('/api/letters/:id/comments', authMiddleware, (req, res) => {
  const letter = letters.find(l => l.id === parseInt(req.params.id));
  if (!letter) {
    return res.status(404).json({ error: '信件不存在' });
  }
  const isUnlocked = new Date(letter.unlockAt) <= new Date();
  if (!isUnlocked) {
    return res.status(403).json({ error: '信件未解锁，无法评论' });
  }
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  const comment = {
    id: Date.now(),
    content: content.trim(),
    nickname: users.find(u => u.id === req.user.id)?.nickname || req.user.username,
    userId: req.user.id,
    createdAt: new Date().toISOString(),
  };
  letter.comments.push(comment);
  res.status(201).json(comment);
});

app.get('/api/me/letters', authMiddleware, (req, res) => {
  const myLetters = letters
    .filter(l => l.authorId === req.user.id)
    .map(l => {
      const isUnlocked = new Date(l.unlockAt) <= new Date();
      return {
        ...l,
        content: isUnlocked ? l.content : l.content.slice(0, 20) + '...',
        isUnlocked,
        likes: l.likes.length,
        hasLiked: false,
        comments: l.comments.map(c => ({ id: c.id, content: c.content, nickname: c.nickname, createdAt: c.createdAt })),
      };
    });
  res.json(myLetters);
});

app.listen(PORT, () => {
  console.log(`🪄 回声信箱后端服务已启动: http://localhost:${PORT}`);
});
