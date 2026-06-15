import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { all, get, run } from '../db.js';

const router = Router();

function parseBook(book: any): any {
  return {
    ...book,
    tags: book.tags ? JSON.parse(book.tags) : [],
    gradient_colors: book.gradient_colors ? JSON.parse(book.gradient_colors) : null
  };
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { from_user_id, to_user_id, from_book_id, to_book_id } = req.body;

    if (!from_user_id || !to_user_id || !from_book_id || !to_book_id) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const id = uuidv4();

    await run(
      'INSERT INTO exchanges (id, from_user_id, to_user_id, from_book_id, to_book_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, from_user_id, to_user_id, from_book_id, to_book_id, 'pending']
    );

    const notificationId = uuidv4();
    const fromBook = await get('SELECT title FROM books WHERE id = ?', [from_book_id]);
    const fromUser = await get('SELECT username FROM users WHERE id = ?', [from_user_id]);

    await run(
      'INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)',
      [
        notificationId,
        to_user_id,
        'exchange_request',
        `${fromUser?.username || '用户'} 想和你交换《${fromBook?.title || '图书'}》`,
        id
      ]
    );

    const exchange = await get('SELECT * FROM exchanges WHERE id = ?', [id]);
    res.status(201).json({ exchange });
  } catch (error) {
    console.error('发起交换错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const exchanges = await all(
      `SELECT e.*,
              fb.title as from_book_title, fb.author as from_book_author, fb.tags as from_book_tags, fb.gradient_colors as from_book_gradient,
              tb.title as to_book_title, tb.author as to_book_author, tb.tags as to_book_tags, tb.gradient_colors as to_book_gradient,
              fu.username as from_user_name,
              tu.username as to_user_name
       FROM exchanges e
       JOIN books fb ON e.from_book_id = fb.id
       JOIN books tb ON e.to_book_id = tb.id
       JOIN users fu ON e.from_user_id = fu.id
       JOIN users tu ON e.to_user_id = tu.id
       WHERE e.from_user_id = ? OR e.to_user_id = ?
       ORDER BY e.created_at DESC`,
      [userId, userId]
    );

    const parsedExchanges = exchanges.map(ex => ({
      id: ex.id,
      from_user_id: ex.from_user_id,
      to_user_id: ex.to_user_id,
      from_user_name: ex.from_user_name,
      to_user_name: ex.to_user_name,
      from_book: {
        id: ex.from_book_id,
        title: ex.from_book_title,
        author: ex.from_book_author,
        tags: JSON.parse(ex.from_book_tags || '[]'),
        gradient_colors: JSON.parse(ex.from_book_gradient || 'null')
      },
      to_book: {
        id: ex.to_book_id,
        title: ex.to_book_title,
        author: ex.to_book_author,
        tags: JSON.parse(ex.to_book_tags || '[]'),
        gradient_colors: JSON.parse(ex.to_book_gradient || 'null')
      },
      status: ex.status,
      created_at: ex.created_at,
      completed_at: ex.completed_at
    }));

    res.json({ exchanges: parsedExchanges });
  } catch (error) {
    console.error('获取交换列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'rejected', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }

    const exchange = await get('SELECT * FROM exchanges WHERE id = ?', [id]);
    if (!exchange) {
      return res.status(404).json({ error: '交换不存在' });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    if (completedAt) {
      await run('UPDATE exchanges SET status = ?, completed_at = ? WHERE id = ?', [status, completedAt, id]);
    } else {
      await run('UPDATE exchanges SET status = ? WHERE id = ?', [status, id]);
    }

    const statusMap: Record<string, string> = {
      confirmed: '已确认',
      rejected: '已拒绝',
      cancelled: '已取消',
      in_progress: '进行中',
      completed: '已完成'
    };

    const notifyUserId = exchange.from_user_id;
    const notificationId = uuidv4();

    await run(
      'INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)',
      [
        notificationId,
        notifyUserId,
        'exchange_update',
        `交换请求${statusMap[status] || '状态更新'}`,
        id
      ]
    );

    const updatedExchange = await get('SELECT * FROM exchanges WHERE id = ?', [id]);
    res.json({ exchange: updatedExchange });
  } catch (error) {
    console.error('更新交换状态错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export { router as exchangesRouter };
