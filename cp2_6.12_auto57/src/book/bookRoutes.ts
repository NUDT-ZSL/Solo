import { Router, type Request, type Response } from 'express';
import {
  getAllBooks,
  getPopularBooks,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
  getAllCategories,
} from './bookService';

const router = Router();

router.get('/popular', (_req: Request, res: Response): void => {
  try {
    const books = getPopularBooks(6);
    res.json({ success: true, books });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/categories', (_req: Request, res: Response): void => {
  try {
    const categories = getAllCategories();
    res.json({ success: true, categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const book = getBookById(req.params.id);
    if (!book) {
      res.status(404).json({ success: false, error: '图书不存在' });
      return;
    }
    res.json({ success: true, book });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', (req: Request, res: Response): void => {
  try {
    const { search, category } = req.query;
    const books = getAllBooks(
      typeof search === 'string' ? search : undefined,
      typeof category === 'string' ? category : undefined
    );
    res.json({ success: true, books });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const { isbn, title, author, category, totalCopies, coverUrl, description } = req.body;

    if (!isbn || !title || !author || !category || totalCopies === undefined) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }

    const book = addBook({ isbn, title, author, category, totalCopies: Number(totalCopies), coverUrl, description });
    res.json({ success: true, book });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const book = updateBook(req.params.id, req.body);
    res.json({ success: true, book });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    deleteBook(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
