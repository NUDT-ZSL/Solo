const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readData, writeData } = require('../utils/fileStorage');

const router = express.Router();

router.post('/register', (req, res) => {
  const { nickname, email, password } = req.body;
  const users = readData('users.json');
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: '该邮箱已注册' });
  }
  const newUser = {
    id: uuidv4(),
    nickname,
    email,
    password,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nickname)}`,
    points: 0,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeData('users.json', users);
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ user: userWithoutPassword, token: newUser.id });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = readData('users.json');
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(400).json({ error: '邮箱或密码错误' });
  }
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword, token: user.id });
});

router.get('/:id', (req, res) => {
  const users = readData('users.json');
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

router.put('/:id', (req, res) => {
  const users = readData('users.json');
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });
  users[idx] = { ...users[idx], ...req.body };
  writeData('users.json', users);
  const { password: _, ...userWithoutPassword } = users[idx];
  res.json(userWithoutPassword);
});

router.get('/', (_req, res) => {
  const users = readData('users.json');
  const result = users.map(({ password, ...rest }) => rest);
  res.json(result);
});

module.exports = router;
