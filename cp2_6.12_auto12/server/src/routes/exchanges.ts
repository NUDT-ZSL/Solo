const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, all, snakeToCamel } = require('../db');

const router = express.Router();

router.post('/api/exchanges', (req: any, res: any) => {
  try {
    const { itemId, fromUserId, fromUserName, toUserId, toUserName, message } = req.body;

    if (!itemId || !fromUserId || !fromUserName || !toUserId || !toUserName) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const item = get('SELECT * FROM items WHERE id = ? AND status = ?', [itemId, 'available']);
    if (!item) {
      return res.status(404).json({ error: '物品不存在或已被交换' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: '不能与自己发起交换' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const status = 'pending';

    run(`
      INSERT INTO exchanges (id, item_id, item_title, from_user_id, from_user_name, to_user_id, to_user_name, status, message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      itemId,
      item.title,
      fromUserId,
      fromUserName,
      toUserId,
      toUserName,
      status,
      message || null,
      now,
      now
    ]);

    run('UPDATE items SET status = ?, updated_at = ? WHERE id = ?', [
      'exchanged',
      now,
      itemId
    ]);

    const exchange = get('SELECT * FROM exchanges WHERE id = ?', [id]);
    res.status(201).json(snakeToCamel(exchange));
  } catch (error: any) {
    console.error('POST /api/exchanges error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
});

router.get('/api/exchanges', (req: any, res: any) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: '缺少 userId 参数' });
    }

    const exchanges = all(`
      SELECT * FROM exchanges
      WHERE from_user_id = ? OR to_user_id = ?
      ORDER BY created_at DESC
    `, [userId, userId]);

    res.json(exchanges.map(snakeToCamel));
  } catch (error: any) {
    console.error('GET /api/exchanges error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
});

router.put('/api/exchanges/:id', (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '状态必须是 accepted 或 rejected' });
    }

    const existingExchange = get('SELECT * FROM exchanges WHERE id = ?', [id]);
    if (!existingExchange) {
      return res.status(404).json({ error: '交换记录不存在' });
    }

    if (existingExchange.status !== 'pending') {
      return res.status(400).json({ error: '只能处理待处理的交换请求' });
    }

    const now = new Date().toISOString();

    run('UPDATE exchanges SET status = ?, updated_at = ? WHERE id = ?', [
      status,
      now,
      id
    ]);

    if (status === 'accepted') {
      run('UPDATE items SET status = ?, updated_at = ? WHERE id = ?', [
        'exchanged',
        now,
        existingExchange.item_id
      ]);
    }

    const updatedExchange = get('SELECT * FROM exchanges WHERE id = ?', [id]);
    res.json(snakeToCamel(updatedExchange));
  } catch (error: any) {
    console.error('PUT /api/exchanges/:id error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
});

module.exports = router;
