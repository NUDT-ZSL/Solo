import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { q = '', category = '' } = req.query;
  const searchTerm = `%${q}%`;
  
  let query = 'SELECT * FROM books WHERE 1=1';
  const params: string[] = [];
  
  if (q) {
    query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (category) {
    query += ' AND category = ?';
    params.push(category as string);
  }
  
  query += ' ORDER BY created_at DESC';
  
  try {
    const books = db.prepare(query).all(...params);
    res.json({ success: true, data: books });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询图书失败' });
  }
});

router.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM books WHERE category IS NOT NULL').all();
    res.json({ success: true, data: categories.map((c: any) => c.category) });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取分类失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ success: false, message: '图书不存在' });
    }
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取图书详情失败' });
  }
});

router.post('/reserve', (req: Request, res: Response) => {
  const { book_id, user_id, pickup_date } = req.body;
  
  if (!book_id || !user_id || !pickup_date) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
    if (!book) {
      return res.status(404).json({ success: false, message: '图书不存在' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const existingReservation = db.prepare(`
      SELECT * FROM reservations 
      WHERE book_id = ? AND user_id = ? AND status = 'pending'
    `).get(book_id, user_id);
    
    if (existingReservation) {
      return res.status(400).json({ success: false, message: '您已预约过这本书' });
    }
    
    const reservationId = uuidv4();
    
    const insert = db.prepare(`
      INSERT INTO reservations (id, book_id, user_id, pickup_date, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    
    insert.run(reservationId, book_id, user_id, pickup_date);
    
    const updateBook = db.prepare('UPDATE books SET status = ? WHERE id = ?');
    updateBook.run('reserved', book_id);
    
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
    
    res.json({ success: true, data: reservation, message: '预约成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '预约失败' });
  }
});

router.delete('/reserve/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id) as any;
    if (!reservation) {
      return res.status(404).json({ success: false, message: '预约不存在' });
    }
    
    db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(id);
    
    const otherPending = db.prepare(`
      SELECT COUNT(*) as count FROM reservations 
      WHERE book_id = ? AND status = 'pending'
    `).get(reservation.book_id) as { count: number };
    
    if (otherPending.count === 0) {
      const borrowed = db.prepare(`
        SELECT COUNT(*) as count FROM borrow_records 
        WHERE book_id = ? AND status IN ('borrowed', 'overdue')
      `).get(reservation.book_id) as { count: number };
      
      if (borrowed.count === 0) {
        db.prepare("UPDATE books SET status = 'available' WHERE id = ?").run(reservation.book_id);
      }
    }
    
    res.json({ success: true, message: '预约已取消' });
  } catch (error) {
    res.status(500).json({ success: false, message: '取消预约失败' });
  }
});

router.get('/reservations/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    const reservations = db.prepare(`
      SELECT r.*, b.title, b.author, b.cover_emoji, b.location
      FROM reservations r
      JOIN books b ON r.book_id = b.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);
    
    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取预约列表失败' });
  }
});

router.get('/reservations/pending', (_req: Request, res: Response) => {
  try {
    const reservations = db.prepare(`
      SELECT r.*, b.title, b.author, b.cover_emoji, u.name as user_name
      FROM reservations r
      JOIN books b ON r.book_id = b.id
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC
    `).all();
    
    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取待处理预约失败' });
  }
});

export default router;
