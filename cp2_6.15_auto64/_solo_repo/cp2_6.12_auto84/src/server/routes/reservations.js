import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';

const router = express.Router();

function getDateDiffInDays(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

router.get('/', (req, res) => {
  const { toolId, userId } = req.query;
  let query = `
    SELECT r.*, t.name as tool_name, t.image_url as tool_image,
           u1.username as borrower_name, u1.avatar_url as borrower_avatar,
           u2.username as owner_name
    FROM reservations r
    LEFT JOIN tools t ON r.tool_id = t.id
    LEFT JOIN users u1 ON r.borrower_id = u1.id
    LEFT JOIN users u2 ON t.owner_id = u2.id
    WHERE 1=1
  `;
  const params = [];

  if (toolId) {
    query += ' AND r.tool_id = ?';
    params.push(toolId);
  }

  if (userId) {
    query += ' AND (r.borrower_id = ? OR t.owner_id = ?)';
    params.push(userId, userId);
  }

  query += ' ORDER BY r.created_at DESC';

  try {
    const reservations = db.prepare(query).all(...params);
    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req, res) => {
  const { toolId, borrowerId, startDate, endDate, purpose } = req.body;

  if (!toolId || !borrowerId || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: '缺少必要字段' });
  }

  const daysDiff = getDateDiffInDays(startDate, endDate);
  if (daysDiff < 0) {
    return res.status(400).json({ success: false, error: '结束日期不能早于开始日期' });
  }
  if (daysDiff > 7) {
    return res.status(400).json({ success: false, error: '借用时长不能超过7天' });
  }

  try {
    const tool = db.prepare('SELECT status FROM tools WHERE id = ?').get(toolId);
    if (!tool) {
      return res.status(404).json({ success: false, error: '工具不存在' });
    }
    if (tool.status !== '可用') {
      return res.status(400).json({ success: false, error: '该工具当前不可借用' });
    }

    const conflict = db.prepare(`
      SELECT id FROM reservations
      WHERE tool_id = ? AND status IN ('待确认', '进行中')
      AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))
    `).get(toolId, startDate, startDate, endDate, endDate, startDate, endDate);

    if (conflict) {
      return res.status(400).json({ success: false, error: '该时段已有预约，请选择其他日期' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO reservations (id, tool_id, borrower_id, start_date, end_date, purpose, status)
      VALUES (?, ?, ?, ?, ?, ?, '进行中')
    `).run(id, toolId, borrowerId, startDate, endDate, purpose || '');

    db.prepare("UPDATE tools SET status = '已借出' WHERE id = ?").run(toolId);

    const reservation = db.prepare(`
      SELECT r.*, t.name as tool_name, t.image_url as tool_image
      FROM reservations r
      LEFT JOIN tools t ON r.tool_id = t.id
      WHERE r.id = ?
    `).get(id);

    res.json({ success: true, data: reservation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:id/return', (req, res) => {
  const returnTime = new Date().toISOString();

  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, error: '预约不存在' });
    }
    if (reservation.status === '已归还') {
      return res.status(400).json({ success: false, error: '该预约已确认归还' });
    }

    db.prepare(`
      UPDATE reservations SET status = '已归还', returned_at = ? WHERE id = ?
    `).run(returnTime, req.params.id);

    db.prepare("UPDATE tools SET status = '可用' WHERE id = ?").run(reservation.tool_id);

    const updated = db.prepare(`
      SELECT r.*, t.name as tool_name, t.image_url as tool_image,
             u.username as borrower_name, u.credit_score as borrower_credit
      FROM reservations r
      LEFT JOIN tools t ON r.tool_id = t.id
      LEFT JOIN users u ON r.borrower_id = u.id
      WHERE r.id = ?
    `).get(req.params.id);

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
