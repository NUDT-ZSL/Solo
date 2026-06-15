import { Router, Request, Response } from 'express';
import { all, get } from '../db.js';
import { calculateMatchPercentage } from '../utils/matching.js';

const router = Router();

function parseBook(book: any): any {
  return {
    ...book,
    tags: book.tags ? JSON.parse(book.tags) : [],
    gradient_colors: book.gradient_colors ? JSON.parse(book.gradient_colors) : null
  };
}

router.get('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const userBooks = all('SELECT * FROM books WHERE owner_id = ?', [userId]);
    const userTags = new Set<string>();
    userBooks.forEach(book => {
      const tags = JSON.parse(book.tags || '[]');
      tags.forEach((tag: string) => userTags.add(tag));
    });

    const userTagArray = Array.from(userTags);

    const otherBooks = all(
      `SELECT b.*, u.id as owner_id, u.username as owner_name, u.latitude as owner_lat, u.longitude as owner_lon
       FROM books b
       JOIN users u ON b.owner_id = u.id
       WHERE b.owner_id != ?`,
      [userId]
    );

    const matches = otherBooks.map(book => {
      const bookTags = JSON.parse(book.tags || '[]');
      const matchPercentage = calculateMatchPercentage(
        userTagArray,
        bookTags,
        user.latitude,
        user.longitude,
        book.owner_lat,
        book.owner_lon
      );

      return {
        book: parseBook(book),
        owner: {
          id: book.owner_id,
          username: book.owner_name
        },
        matchPercentage
      };
    });

    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    const filteredMatches = matches.filter(m => m.matchPercentage > 0);

    res.json({ matches: filteredMatches });
  } catch (error) {
    console.error('智能匹配错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export { router as matchesRouter };
