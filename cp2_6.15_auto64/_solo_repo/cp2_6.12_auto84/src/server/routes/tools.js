import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { category, search } = req.query;
  let query = `
    SELECT t.*, u.username as owner_name, u.avatar_url as owner_avatar
    FROM tools t
    LEFT JOIN users u ON t.owner_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (category && category !== 'all') {
    query += ' AND t.category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (t.name LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.created_at DESC';

  try {
    const tools = db.prepare(query).all(...params);
    res.json({ success: true, data: tools });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const tool = db.prepare(`
      SELECT t.*, u.username as owner_name, u.avatar_url as owner_avatar
      FROM tools t
      LEFT JOIN users u ON t.owner_id = u.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!tool) {
      return res.status(404).json({ success: false, error: '工具不存在' });
    }

    res.json({ success: true, data: tool });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req, res) => {
  const { name, category, imageUrl, description, availableFrom, availableTo, ownerId } = req.body;

  if (!name || !category || !ownerId) {
    return res.status(400).json({ success: false, error: '缺少必要字段' });
  }

  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO tools (id, name, category, image_url, description, status, owner_id, available_from, available_to)
      VALUES (?, ?, ?, ?, ?, '可用', ?, ?, ?)
    `).run(id, name, category, imageUrl || '', description || '', ownerId, availableFrom || '09:00', availableTo || '18:00');

    const tool = db.prepare('SELECT * FROM tools WHERE id = ?').get(id);
    res.json({ success: true, data: tool });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:id', (req, res) => {
  const { status } = req.body;
  const validStatus = ['可用', '已借出', '维修中'];

  if (!validStatus.includes(status)) {
    return res.status(400).json({ success: false, error: '无效的状态值' });
  }

  try {
    const result = db.prepare('UPDATE tools SET status = ? WHERE id = ?').run(status, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '工具不存在' });
    }
    const tool = db.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: tool });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
