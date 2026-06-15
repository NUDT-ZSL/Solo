const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all, snakeToCamel } = require('../db');

const router = express.Router();

function getCountWithParams(whereSql: string, params: any[]): number {
  const countSql = `SELECT COUNT(*) as total FROM items ${whereSql}`;
  const result = get(countSql, params);
  return result ? result.total : 0;
}

router.get('/api/items', (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const category = req.query.category;
    const keyword = req.query.keyword;

    const offset = (page - 1) * limit;

    let whereClauses: string[] = ['status = ?'];
    let params: any[] = ['available'];

    if (category && category !== 'all') {
      whereClauses.push('category = ?');
      params.push(category);
    }

    if (keyword) {
      whereClauses.push('(title LIKE ? OR description LIKE ?)');
      const searchKeyword = `%${keyword}%`;
      params.push(searchKeyword, searchKeyword);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const total = getCountWithParams(whereSql, params);

    const itemsSql = `
      SELECT * FROM items ${whereSql}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const items = all(itemsSql, params);

    const hasMore = page * limit < total;

    res.json({
      items: items.map(snakeToCamel),
      total,
      hasMore,
    });
  } catch (error: any) {
    console.error('GET /api/items error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
});

router.get('/api/items/:id', (req: any, res: any) => {
  try {
    const { id } = req.params;
    const item = get('SELECT * FROM items WHERE id = ?', [id]);

    if (!item) {
      return res.status(404).json({ error: '物品不存在' });
    }

    res.json(snakeToCamel(item));
  } catch (error: any) {
    console.error('GET /api/items/:id error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
});

router.post('/api/items', (req: any, res: any) => {
  try {
    const { title, description, category, imageUrl, contact, ownerId, ownerName } = req.body;

    if (!title || !description || !category || !imageUrl || !contact || !ownerId || !ownerName) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const status = 'available';

    run(`
      INSERT INTO items (id, title, description, category, image_url, contact, status, owner_id, owner_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      title,
      description,
      category,
      imageUrl,
      contact,
      status,
      ownerId,
      ownerName,
      now,
      now
    ]);

    const item = get('SELECT * FROM items WHERE id = ?', [id]);
    res.status(201).json(snakeToCamel(item));
  } catch (error: any) {
    console.error('POST /api/items error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
});

router.put('/api/items/:id', (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title, description, category, imageUrl, contact, status } = req.body;

    const existingItem = get('SELECT * FROM items WHERE id = ?', [id]);
    if (!existingItem) {
      return res.status(404).json({ error: '物品不存在' });
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(imageUrl);
    }
    if (contact !== undefined) {
      updates.push('contact = ?');
      params.push(contact);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    if (updates.length > 0) {
      run(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updatedItem = get('SELECT * FROM items WHERE id = ?', [id]);
    res.json(snakeToCamel(updatedItem));
  } catch (error: any) {
    console.error('PUT /api/items/:id error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
});

router.delete('/api/items/:id', (req: any, res: any) => {
  try {
    const { id } = req.params;

    const existingItem = get('SELECT * FROM items WHERE id = ?', [id]);
    if (!existingItem) {
      return res.status(404).json({ error: '物品不存在' });
    }

    run('UPDATE items SET status = ?, updated_at = ? WHERE id = ?', [
      'exchanged',
      new Date().toISOString(),
      id
    ]);

    res.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/items/:id error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
});

router.get('/api/users/:userId/items', (req: any, res: any) => {
  try {
    const { userId } = req.params;

    const items = all(`
      SELECT * FROM items WHERE owner_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    res.json(items.map(snakeToCamel));
  } catch (error: any) {
    console.error('GET /api/users/:userId/items error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
});

module.exports = router;
