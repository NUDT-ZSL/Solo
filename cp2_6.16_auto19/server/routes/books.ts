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

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, tags, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let sql = 'SELECT * FROM books WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ' AND (title LIKE ? OR author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (tags) {
      const tagList = (tags as string).split(',');
      const tagConditions = tagList.map(() => 'tags LIKE ?').join(' AND ');
      sql += ` AND (${tagConditions})`;
      tagList.forEach(tag => params.push(`%"${tag}"%`));
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await get(countSql, params);
    const total = countResult?.count || 0;

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const books = await all(sql, params);
    const parsedBooks = books.map(parseBook);

    res.json({
      books: parsedBooks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('获取图书列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const book = await get('SELECT * FROM books WHERE id = ?', [id]);

    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }

    const owner = await get('SELECT id, username, email, reputation FROM users WHERE id = ?', [book.owner_id]);

    res.json({ book: parseBook(book), owner });
  } catch (error) {
    console.error('获取图书详情错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const books = await all('SELECT * FROM books WHERE owner_id = ? ORDER BY created_at DESC', [userId]);
    res.json({ books: books.map(parseBook) });
  } catch (error) {
    console.error('获取用户图书错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { owner_id, title, author, tags, condition, image_url, gradient_colors } = req.body;

    if (!owner_id || !title || !author) {
      return res.status(400).json({ error: '所有者ID、书名和作者不能为空' });
    }

    const id = uuidv4();
    const tagsJson = JSON.stringify(tags || []);
    const gradientJson = gradient_colors ? JSON.stringify(gradient_colors) : null;

    await run(
      'INSERT INTO books (id, owner_id, title, author, tags, condition, image_url, gradient_colors) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, owner_id, title, author, tagsJson, condition || '八成新', image_url || null, gradientJson]
    );

    const book = await get('SELECT * FROM books WHERE id = ?', [id]);
    res.status(201).json({ book: parseBook(book) });
  } catch (error) {
    console.error('发布图书错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export { router as booksRouter };
