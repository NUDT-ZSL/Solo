import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db.js';

const router = express.Router();

function calculateNewCreditScore(oldScore, ratingScore, totalRatings) {
  const ratingToCreditMap = { 1: -5, 2: -2, 3: 0, 4: 2, 5: 5 };
  const adjustment = ratingToCreditMap[ratingScore] || 0;
  let newScore = oldScore + adjustment;
  if (totalRatings >= 5 && ratingScore >= 4) {
    newScore += 1;
  }
  return Math.max(0, Math.min(100, newScore));
}

function getCreditLevel(score) {
  if (score >= 85) return '优秀';
  if (score >= 70) return '良好';
  if (score >= 50) return '一般';
  return '较差';
}

router.get('/:userId', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, avatar_url, credit_score, credit_level
      FROM users WHERE id = ?
    `).get(req.params.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const ratings = db.prepare(`
      SELECT r.*, u.username as from_user_name, u.avatar_url as from_user_avatar,
             t.name as tool_name
      FROM ratings r
      LEFT JOIN users u ON r.from_user_id = u.id
      LEFT JOIN reservations rv ON r.reservation_id = rv.id
      LEFT JOIN tools t ON rv.tool_id = t.id
      WHERE r.to_user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all(req.params.userId);

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_ratings,
        AVG(score) as avg_score,
        (SELECT COUNT(*) FROM reservations WHERE borrower_id = ?) as total_borrowed,
        (SELECT COUNT(*) FROM reservations WHERE borrower_id = ? AND status = '已归还') as returned_count,
        (SELECT COUNT(*) FROM reservations WHERE status = '已逾期' AND borrower_id = ?) as overdue_count,
        (SELECT COUNT(*) FROM tools WHERE owner_id = ?) as tools_owned
      FROM ratings WHERE to_user_id = ?
    `).get(req.params.userId, req.params.userId, req.params.userId, req.params.userId, req.params.userId);

    const history = db.prepare(`
      SELECT rv.*, t.name as tool_name, t.owner_id,
             u.username as owner_name, 'borrowed' as type
      FROM reservations rv
      LEFT JOIN tools t ON rv.tool_id = t.id
      LEFT JOIN users u ON t.owner_id = u.id
      WHERE rv.borrower_id = ?
      UNION ALL
      SELECT rv.*, t.name as tool_name, t.owner_id,
             u.username as borrower_name, 'lent' as type
      FROM reservations rv
      LEFT JOIN tools t ON rv.tool_id = t.id
      LEFT JOIN users u ON rv.borrower_id = u.id
      WHERE t.owner_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(req.params.userId, req.params.userId);

    res.json({
      success: true,
      data: {
        user,
        ratings,
        stats: {
          ...stats,
          avg_score: stats.avg_score ? Number(stats.avg_score.toFixed(1)) : 0,
          on_time_rate: stats.total_borrowed > 0
            ? Math.round(((stats.returned_count - stats.overdue_count) / stats.total_borrowed) * 100)
            : 100,
        },
        history,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req, res) => {
  const { reservationId, fromUserId, toUserId, score, comment } = req.body;

  if (!reservationId || !fromUserId || !toUserId || !score) {
    return res.status(400).json({ success: false, error: '缺少必要字段' });
  }

  const ratingScore = Number(score);
  if (ratingScore < 1 || ratingScore > 5) {
    return res.status(400).json({ success: false, error: '评分必须在1-5之间' });
  }

  try {
    const existing = db.prepare('SELECT id FROM ratings WHERE reservation_id = ? AND from_user_id = ?').get(reservationId, fromUserId);
    if (existing) {
      return res.status(400).json({ success: false, error: '您已对该预约进行过评价' });
    }

    const user = db.prepare('SELECT credit_score FROM users WHERE id = ?').get(toUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: '被评价用户不存在' });
    }

    const totalRatings = db.prepare('SELECT COUNT(*) as count FROM ratings WHERE to_user_id = ?').get(toUserId).count;
    const newScore = calculateNewCreditScore(user.credit_score, ratingScore, totalRatings);
    const newLevel = getCreditLevel(newScore);

    db.prepare('UPDATE users SET credit_score = ?, credit_level = ? WHERE id = ?').run(newScore, newLevel, toUserId);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO ratings (id, reservation_id, from_user_id, to_user_id, score, comment)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, reservationId, fromUserId, toUserId, ratingScore, comment || '');

    const rating = db.prepare(`
      SELECT r.*, u.username as from_user_name
      FROM ratings r
      LEFT JOIN users u ON r.from_user_id = u.id
      WHERE r.id = ?
    `).get(id);

    res.json({
      success: true,
      data: {
        rating,
        newCreditScore: newScore,
        newCreditLevel: newLevel,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
