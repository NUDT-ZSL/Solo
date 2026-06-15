import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getOne, run, runTransaction } from '../database';

const router = Router();

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
  description: string;
  userId: string;
  status: 'available' | 'exchanged';
  createdAt: string;
}

router.get('/', (req: Request, res: Response) => {
  const {
    search = '',
    page = 1,
    limit = 12,
    sort = 'newest',
    userId,
  } = req.query as {
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    userId?: string;
  };

  const pageNum = parseInt(String(page), 10);
  const limitNum = parseInt(String(limit), 10);
  const offset = (pageNum - 1) * limitNum;

  let whereClause = '';
  const params: (string | number)[] = [];
  const conditions: string[] = [];

  if (search) {
    conditions.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (userId) {
    conditions.push('userId = ?');
    params.push(userId);
  }

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  let orderBy = 'createdAt DESC';
  switch (sort) {
    case 'oldest':
      orderBy = 'createdAt ASC';
      break;
    case 'title':
      orderBy = 'title ASC';
      break;
    case 'newest':
    default:
      orderBy = 'createdAt DESC';
      break;
  }

  const countResult = getOne<{ total: number }>(`SELECT COUNT(*) as total FROM books ${whereClause}`, params);
  const total = countResult?.total || 0;

  const querySql = `SELECT * FROM books ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  params.push(limitNum, offset);
  const books = query<Book>(querySql, params);

  res.json({
    books,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const book = getOne<Book>('SELECT * FROM books WHERE id = ?', [id]);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.json(book);
});

router.post('/', (req: Request, res: Response) => {
  const { title, author, isbn = '', coverUrl = '', description = '', userId } = req.body;

  if (!title || !author || !userId) {
    return res.status(400).json({ error: 'Title, author, and userId are required' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  run(
    'INSERT INTO books (id, title, author, isbn, coverUrl, description, userId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, title, author, isbn, coverUrl, description, userId, 'available', createdAt]
  );

  const newBook = getOne<Book>('SELECT * FROM books WHERE id = ?', [id]);
  res.status(201).json(newBook);
});

router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const book = getOne<Book>('SELECT * FROM books WHERE id = ?', [id]);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  runTransaction(() => {
    run(
      "UPDATE exchanges SET status = 'cancelled' WHERE bookId = ? AND status = 'pending'",
      [id]
    );
    run('DELETE FROM books WHERE id = ?', [id]);
  });

  res.json({ success: true, message: 'Book deleted and related pending exchanges cancelled' });
});

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, author, isbn, coverUrl, description, status } = req.body;

  const book = getOne<Book>('SELECT * FROM books WHERE id = ?', [id]);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  run(
    `UPDATE books SET 
      title = COALESCE(?, title),
      author = COALESCE(?, author),
      isbn = COALESCE(?, isbn),
      coverUrl = COALESCE(?, coverUrl),
      description = COALESCE(?, description),
      status = COALESCE(?, status)
    WHERE id = ?`,
    [
      title ?? null,
      author ?? null,
      isbn ?? null,
      coverUrl ?? null,
      description ?? null,
      status ?? null,
      id,
    ]
  );

  const updatedBook = getOne<Book>('SELECT * FROM books WHERE id = ?', [id]);
  res.json(updatedBook);
});

export default router;
