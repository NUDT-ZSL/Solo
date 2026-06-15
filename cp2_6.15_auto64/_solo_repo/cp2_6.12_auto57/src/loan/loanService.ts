import { v4 as uuidv4 } from 'uuid';
import { getDb, rowToLoan, rowToReservation, rowToBook } from '../database';
import { getBookById, updateBook } from '../book/bookService';
import { getUserById } from '../user/userService';
import type { Loan, Reservation, LoanStats, Book } from '../types';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function createLoan(userId: string, bookId: string): Loan {
  const db = getDb();

  const user = getUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const book = getBookById(bookId);
  if (!book) {
    throw new Error('图书不存在');
  }

  if (book.availableCopies <= 0) {
    throw new Error('图书无库存，可加入预约队列');
  }

  const activeLoan = db.exec(
    'SELECT id FROM loans WHERE userId = ? AND bookId = ? AND returnDate IS NULL',
    [userId, bookId]
  );
  if (activeLoan.length > 0 && activeLoan[0].values.length > 0) {
    throw new Error('您已借阅此书，请勿重复借阅');
  }

  const id = uuidv4();
  const borrowDate = formatDate(new Date());
  const dueDate = addDays(borrowDate, 14);

  db.run(
    `INSERT INTO loans (id, userId, bookId, borrowDate, dueDate, returnDate, overdue, fine, lost)
     VALUES (?, ?, ?, ?, ?, NULL, 0, 0, 0)`,
    [id, userId, bookId, borrowDate, dueDate]
  );

  updateBook(bookId, { availableCopies: book.availableCopies - 1 } as Partial<Book>);

  db.run('UPDATE books SET borrowCount = borrowCount + 1 WHERE id = ?', [bookId]);

  const userReservations = db.exec(
    'SELECT id FROM reservations WHERE userId = ? AND bookId = ? AND status = "active"',
    [userId, bookId]
  );
  if (userReservations.length > 0 && userReservations[0].values.length > 0) {
    const reservationId = userReservations[0].values[0][0] as string;
    db.run('UPDATE reservations SET status = "fulfilled" WHERE id = ?', [reservationId]);
    updateReservationsPosition(bookId);
  }

  return getLoanById(id)!;
}

export function returnLoan(loanId: string): Loan {
  const db = getDb();

  const loan = getLoanById(loanId);
  if (!loan) {
    throw new Error('借阅记录不存在');
  }

  if (loan.returnDate) {
    throw new Error('该借阅已归还');
  }

  const returnDate = formatDate(new Date());
  let fine = 0;
  let overdue = false;
  let lost = false;

  if (returnDate > loan.dueDate) {
    overdue = true;
    const overdueDays = daysBetween(loan.dueDate, returnDate);
    fine = overdueDays * 0.5;
    if (overdueDays > 30) {
      lost = true;
    }
  }

  db.run(
    `UPDATE loans SET returnDate = ?, overdue = ?, fine = ?, lost = ? WHERE id = ?`,
    [returnDate, overdue ? 1 : 0, fine, lost ? 1 : 0, loanId]
  );

  const book = getBookById(loan.bookId);
  if (book) {
    updateBook(loan.bookId, { availableCopies: book.availableCopies + 1 } as Partial<Book>);
  }

  return getLoanById(loanId)!;
}

export function getLoanById(id: string): Loan | null {
  const db = getDb();

  const result = db.exec(
    `SELECT l.id, l.userId, l.bookId, l.borrowDate, l.dueDate, l.returnDate, l.overdue, l.fine, l.lost,
            u.username as userName, b.title as bookTitle
     FROM loans l
     LEFT JOIN users u ON l.userId = u.id
     LEFT JOIN books b ON l.bookId = b.id
     WHERE l.id = ?`,
    [id]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToLoan(result[0].values[0]);
}

export function getUserLoans(userId: string, year?: string, category?: string): Loan[] {
  const db = getDb();
  let query = `SELECT l.id, l.userId, l.bookId, l.borrowDate, l.dueDate, l.returnDate, l.overdue, l.fine, l.lost,
                      u.username as userName, b.title as bookTitle
               FROM loans l
               LEFT JOIN users u ON l.userId = u.id
               LEFT JOIN books b ON l.bookId = b.id
               WHERE l.userId = ?`;
  const params: any[] = [userId];

  if (year) {
    query += ` AND strftime('%Y', l.borrowDate) = ?`;
    params.push(year);
  }

  if (category) {
    query += ` AND b.category = ?`;
    params.push(category);
  }

  query += ` ORDER BY l.borrowDate DESC`;

  const result = db.exec(query, params);

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(rowToLoan);
}

export function getAllLoans(userName?: string, bookTitle?: string, dateFrom?: string, dateTo?: string): Loan[] {
  const db = getDb();
  let query = `SELECT l.id, l.userId, l.bookId, l.borrowDate, l.dueDate, l.returnDate, l.overdue, l.fine, l.lost,
                      u.username as userName, b.title as bookTitle
               FROM loans l
               LEFT JOIN users u ON l.userId = u.id
               LEFT JOIN books b ON l.bookId = b.id
               WHERE 1=1`;
  const params: any[] = [];

  if (userName) {
    query += ` AND u.username LIKE ?`;
    params.push(`%${userName}%`);
  }

  if (bookTitle) {
    query += ` AND b.title LIKE ?`;
    params.push(`%${bookTitle}%`);
  }

  if (dateFrom) {
    query += ` AND l.borrowDate >= ?`;
    params.push(dateFrom);
  }

  if (dateTo) {
    query += ` AND l.borrowDate <= ?`;
    params.push(dateTo);
  }

  query += ` ORDER BY l.borrowDate DESC`;

  const result = db.exec(query, params);

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(rowToLoan);
}

export function getOverdueLoans(): Loan[] {
  const db = getDb();

  const result = db.exec(
    `SELECT l.id, l.userId, l.bookId, l.borrowDate, l.dueDate, l.returnDate, l.overdue, l.fine, l.lost,
            u.username as userName, b.title as bookTitle
     FROM loans l
     LEFT JOIN users u ON l.userId = u.id
     LEFT JOIN books b ON l.bookId = b.id
     WHERE l.overdue = 1 AND l.returnDate IS NULL
     ORDER BY l.dueDate ASC`
  );

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(rowToLoan);
}

export function getUserOverdueCount(userId: string): { count: number; totalFine: number } {
  const loans = getUserLoans(userId).filter(l => l.overdue && !l.returnDate);
  const totalFine = loans.reduce((sum, l) => sum + l.fine, 0);
  return { count: loans.length, totalFine };
}

export function createReservation(userId: string, bookId: string): { reservation: Reservation; position: number } {
  const db = getDb();

  const user = getUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const book = getBookById(bookId);
  if (!book) {
    throw new Error('图书不存在');
  }

  if (book.availableCopies > 0) {
    throw new Error('图书有库存，可直接借阅');
  }

  const existing = db.exec(
    'SELECT id FROM reservations WHERE userId = ? AND bookId = ? AND status = "active"',
    [userId, bookId]
  );
  if (existing.length > 0 && existing[0].values.length > 0) {
    throw new Error('您已在预约队列中');
  }

  const activeCount = db.exec(
    'SELECT COUNT(*) FROM reservations WHERE bookId = ? AND status = "active"',
    [bookId]
  )[0].values[0][0] as number;

  const position = activeCount + 1;
  const id = uuidv4();
  const createdAt = formatDate(new Date());

  db.run(
    `INSERT INTO reservations (id, userId, bookId, position, status, createdAt)
     VALUES (?, ?, ?, ?, 'active', ?)`,
    [id, userId, bookId, position, createdAt]
  );

  const reservation = getReservationById(id)!;
  return { reservation, position };
}

export function getReservationById(id: string): Reservation | null {
  const db = getDb();

  const result = db.exec(
    `SELECT r.id, r.userId, r.bookId, r.position, r.status, r.createdAt, b.title as bookTitle
     FROM reservations r
     LEFT JOIN books b ON r.bookId = b.id
     WHERE r.id = ?`,
    [id]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToReservation(result[0].values[0]);
}

export function getUserReservations(userId: string): Reservation[] {
  const db = getDb();

  const result = db.exec(
    `SELECT r.id, r.userId, r.bookId, r.position, r.status, r.createdAt, b.title as bookTitle
     FROM reservations r
     LEFT JOIN books b ON r.bookId = b.id
     WHERE r.userId = ?
     ORDER BY r.createdAt ASC`,
    [userId]
  );

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(rowToReservation).map(r => {
    if (r.status === 'active') {
      const position = getReservationPosition(r.bookId, r.id);
      return { ...r, position };
    }
    return r;
  });
}

function getReservationPosition(bookId: string, reservationId: string): number {
  const db = getDb();

  const result = db.exec(
    `SELECT COUNT(*) FROM reservations WHERE bookId = ? AND status = 'active' AND createdAt <= (
       SELECT createdAt FROM reservations WHERE id = ?
     )`,
    [bookId, reservationId]
  );

  return result[0].values[0][0] as number;
}

function updateReservationsPosition(bookId: string): void {
  const db = getDb();

  const result = db.exec(
    `SELECT id FROM reservations WHERE bookId = ? AND status = 'active' ORDER BY createdAt ASC`,
    [bookId]
  );

  if (result.length === 0) return;

  result[0].values.forEach((row, index) => {
    db.run('UPDATE reservations SET position = ? WHERE id = ?', [index + 1, row[0]]);
  });
}

export function cancelReservation(reservationId: string): void {
  const db = getDb();

  const reservation = getReservationById(reservationId);
  if (!reservation) {
    throw new Error('预约记录不存在');
  }

  db.run('UPDATE reservations SET status = "cancelled" WHERE id = ?', [reservationId]);
  updateReservationsPosition(reservation.bookId);
}

export function getLoanStats(userId: string): LoanStats {
  const db = getDb();

  const byYearResult = db.exec(
    `SELECT strftime('%Y', l.borrowDate) as year, b.category, COUNT(*) as count
     FROM loans l
     LEFT JOIN books b ON l.bookId = b.id
     WHERE l.userId = ?
     GROUP BY year, b.category
     ORDER BY year ASC`,
    [userId]
  );

  const byYear: { year: string; count: number; category: string }[] = [];
  if (byYearResult.length > 0) {
    for (const row of byYearResult[0].values) {
      byYear.push({
        year: row[0] as string,
        category: row[1] as string,
        count: row[2] as number,
      });
    }
  }

  const byCategoryResult = db.exec(
    `SELECT b.category, COUNT(*) as count
     FROM loans l
     LEFT JOIN books b ON l.bookId = b.id
     WHERE l.userId = ?
     GROUP BY b.category
     ORDER BY count DESC`,
    [userId]
  );

  const byCategory: { category: string; count: number }[] = [];
  if (byCategoryResult.length > 0) {
    for (const row of byCategoryResult[0].values) {
      byCategory.push({
        category: row[0] as string,
        count: row[1] as number,
      });
    }
  }

  return { byYear, byCategory };
}

export function scanOverdueLoans(): number {
  const db = getDb();
  const today = formatDate(new Date());

  const result = db.exec(
    `SELECT id, dueDate FROM loans WHERE returnDate IS NULL AND overdue = 0`
  );

  let updatedCount = 0;

  if (result.length > 0) {
    for (const row of result[0].values) {
      const loanId = row[0] as string;
      const dueDate = row[1] as string;

      if (today > dueDate) {
        const overdueDays = daysBetween(dueDate, today);
        const fine = overdueDays * 0.5;
        const lost = overdueDays > 30 ? 1 : 0;

        db.run(
          `UPDATE loans SET overdue = 1, fine = ?, lost = ? WHERE id = ?`,
          [fine, lost, loanId]
        );
        updatedCount++;
      }
    }
  }

  return updatedCount;
}
