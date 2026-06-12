const express = require('express');
const db = require('../database/db');

const router = express.Router();

router.post('/login', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = db.prepare(`
        SELECT * FROM users WHERE username = ? AND password = ?
    `).get(username, password);

    if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (role && user.role !== role) {
        return res.status(401).json({ error: '角色不匹配' });
    }

    const { password: _, ...userInfo } = user;
    res.json({ user: userInfo });
});

router.get('/me', (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId不能为空' });
    }

    const user = db.prepare(`
        SELECT id, username, role, display_name, class_name, created_at
        FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
        return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
});

module.exports = router;
