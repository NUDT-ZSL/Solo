import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';

const router = Router();

function calculateFine(dueDate: string, returnDate?: string): number {
  const due = new Date(dueDate);
  const now = returnDate ? new Date(returnDate) : new Date();
  
  if (now <= due) return 0;
  
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays * 0.5;
}

router.post('/checkout', (req: Request, res: Response) => {
  const { book_id, user_id, reservation_id } = req.body;
  
  if (!book_id || !user_id) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id) as any;
    if (!book) {
      return res.status(404).json({ success: false, message: '图书不存在' });
    }
    
    if (book.status === 'borrowed') {
      return res.status(400).json({ success: false, message: '图书已被借出' });
    }
    
    const borrowId = uuidv4();
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    const insert = db.prepare(`
      INSERT INTO borrow_records (id, book_id, user_id, reservation_id, borrow_date, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?, 'borrowed')
    `);
    
    insert.run(
      borrowId, 
      book_id, 
      user_id, 
      reservation_id || null, 
      borrowDate.toISOString().split('T')[0], 
      dueDate.toISOString().split('T')[0]
    );
    
    db.prepare("UPDATE books SET status = 'borrowed' WHERE id = ?").run(book_id);
    
    if (reservation_id) {
      db.prepare("UPDATE reservations SET status = 'approved' WHERE id = ?").run(reservation_id);
    }
    
    const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(borrowId);
    
    res.json({ success: true, data: record, message: '借阅成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '借阅失败' });
  }
});

router.post('/return/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(id) as any;
    if (!record) {
      return res.status(404).json({ success: false, message: '借阅记录不存在' });
    }
    
    if (record.status === 'returned') {
      return res.status(400).json({ success: false, message: '图书已归还' });
    }
    
    const returnDate = new Date();
    const fine = calculateFine(record.due_date, returnDate.toISOString());
    
    db.prepare(`
      UPDATE borrow_records 
      SET return_date = ?, fine_amount = ?, status = 'returned'
      WHERE id = ?
    `).run(returnDate.toISOString().split('T')[0], fine, id);
    
    const otherBorrowed = db.prepare(`
      SELECT COUNT(*) as count FROM borrow_records 
      WHERE book_id = ? AND status IN ('borrowed', 'overdue') AND id != ?
    `).get(record.book_id, id) as { count: number };
    
    const hasPendingReservation = db.prepare(`
      SELECT COUNT(*) as count FROM reservations 
      WHERE book_id = ? AND status = 'pending'
    `).get(record.book_id) as { count: number };
    
    if (otherBorrowed.count === 0) {
      const newStatus = hasPendingReservation.count > 0 ? 'reserved' : 'available';
      db.prepare('UPDATE books SET status = ? WHERE id = ?').run(newStatus, record.book_id);
    }
    
    const updatedRecord = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(id);
    
    res.json({ success: true, data: updatedRecord, fine, message: '归还成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '归还失败' });
  }
});

router.get('/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    const records = db.prepare(`
      SELECT br.*, b.title, b.author, b.cover_emoji, b.category
      FROM borrow_records br
      JOIN books b ON br.book_id = b.id
      WHERE br.user_id = ?
      ORDER BY br.borrow_date DESC
    `).all(userId);
    
    const recordsWithFine = (records as any[]).map(record => {
      let currentFine = record.fine_amount || 0;
      let currentStatus = record.status;
      
      if (record.status === 'borrowed' || record.status === 'overdue') {
        currentFine = calculateFine(record.due_date);
        if (currentFine > 0) {
          currentStatus = 'overdue';
        }
      }
      
      return {
        ...record,
        current_fine: currentFine,
        current_status: currentStatus
      };
    });
    
    res.json({ success: true, data: recordsWithFine });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取借阅记录失败' });
  }
});

router.get('/active/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    const records = db.prepare(`
      SELECT br.*, b.title, b.author, b.cover_emoji, b.category
      FROM borrow_records br
      JOIN books b ON br.book_id = b.id
      WHERE br.user_id = ? AND br.status IN ('borrowed', 'overdue')
      ORDER BY br.due_date ASC
    `).all(userId);
    
    const recordsWithFine = (records as any[]).map(record => {
      const currentFine = calculateFine(record.due_date);
      const isOverdue = currentFine > 0;
      
      return {
        ...record,
        current_fine: currentFine,
        current_status: isOverdue ? 'overdue' : 'borrowed'
      };
    });
    
    res.json({ success: true, data: recordsWithFine });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取在借图书失败' });
  }
});

router.get('/all', (_req: Request, res: Response) => {
  try {
    const records = db.prepare(`
      SELECT br.*, b.title, b.author, b.cover_emoji, u.name as user_name
      FROM borrow_records br
      JOIN books b ON br.book_id = b.id
      JOIN users u ON br.user_id = u.id
      ORDER BY br.created_at DESC
      LIMIT 100
    `).all();
    
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取借阅记录失败' });
  }
});

export default router;
