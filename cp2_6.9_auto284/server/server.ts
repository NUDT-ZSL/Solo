import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Book {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: string;
  dailyPages: Record<string, number>;
}

const books: Book[] = [];

const getDayKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

app.get('/api/books', (_req, res) => {
  const sorted = [...books].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

app.post('/api/books', (req, res) => {
  const { title, author, currentPage, totalPages } = req.body;
  if (!title || !author || !totalPages) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const cp = currentPage || 0;
  const status: Book['status'] =
    cp >= totalPages
      ? 'completed'
      : cp > 0
      ? 'in_progress'
      : 'not_started';
  const newBook: Book = {
    id: uuidv4(),
    title,
    author,
    currentPage: cp,
    totalPages,
    status,
    createdAt: new Date().toISOString(),
    dailyPages: {},
  };
  books.push(newBook);
  res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const { currentPage, status } = req.body;
  const book = books.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: '未找到该书' });
  }
  if (currentPage !== undefined) {
    const pageDiff = Math.max(0, currentPage - book.currentPage);
    if (pageDiff > 0) {
      const today = getDayKey(new Date());
      book.dailyPages[today] = (book.dailyPages[today] || 0) + pageDiff;
    }
    book.currentPage = Math.min(currentPage, book.totalPages);
    if (book.currentPage >= book.totalPages) {
      book.status = 'completed';
    } else if (book.currentPage > 0) {
      book.status = 'in_progress';
    }
  }
  if (status !== undefined) {
    book.status = status;
    if (status === 'completed') {
      book.currentPage = book.totalPages;
    }
  }
  res.json(book);
});

app.get('/api/stats', (_req, res) => {
  const now = new Date();
  const weekStart = getStartOfWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  const dailyPagesThisWeek = weekDays.map((d) => {
    const key = getDayKey(d);
    return books.reduce((sum, book) => sum + (book.dailyPages[key] || 0), 0);
  });

  const totalPagesThisWeek = dailyPagesThisWeek.reduce((a, b) => a + b, 0);
  const daysReadThisWeek = dailyPagesThisWeek.filter((p) => p > 0).length;
  const booksReadThisWeek = books.filter((b) => {
    const completedAt = b.status === 'completed' ? new Date(b.createdAt) : null;
    if (completedAt && completedAt >= lastWeekStart && completedAt <= lastWeekEnd) {
      return true;
    }
    const pagesAdded = Object.entries(b.dailyPages).some(([dateKey]) => {
      const d = new Date(dateKey);
      return d >= lastWeekStart && d <= lastWeekEnd;
    });
    return pagesAdded;
  }).length;
  const avgMinutesPerDay = daysReadThisWeek > 0 ? Math.round((totalPagesThisWeek / daysReadThisWeek) * 1.5) : 0;

  const lastWeekDailyPages: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastWeekStart);
    d.setDate(d.getDate() + i);
    const key = getDayKey(d);
    lastWeekDailyPages.push(books.reduce((sum, book) => sum + (book.dailyPages[key] || 0), 0));
  }
  const lastWeekTotalPages = lastWeekDailyPages.reduce((a, b) => a + b, 0);
  const lastWeekBooks = books.filter((b) => {
    return Object.entries(b.dailyPages).some(([dateKey]) => {
      const d = new Date(dateKey);
      return d >= lastWeekStart && d <= lastWeekEnd;
    });
  });

  let mostReadBook = '暂无';
  let mostReadPages = 0;
  const bookShares: { title: string; pages: number }[] = [];
  lastWeekBooks.forEach((book) => {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(lastWeekStart);
      d.setDate(d.getDate() + i);
      const key = getDayKey(d);
      total += book.dailyPages[key] || 0;
    }
    if (total > 0) {
      bookShares.push({ title: book.title, pages: total });
      if (total > mostReadPages) {
        mostReadPages = total;
        mostReadBook = book.title;
      }
    }
  });

  const weeklySummary =
    lastWeekBooks.length > 0
      ? `上周你阅读了${lastWeekBooks.length}本书，共${lastWeekTotalPages}页，最常读的是《${mostReadBook}》`
      : '上周没有阅读记录，本周加油哦！';

  res.json({
    stats: {
      daysReadThisWeek,
      totalPagesThisWeek,
      avgMinutesPerDay,
      booksReadThisWeek,
      dailyPagesThisWeek,
    },
    weeklyReport: {
      summary: weeklySummary,
      dailyPages: lastWeekDailyPages,
      bookShares,
      generated: new Date().toISOString(),
    },
  });
});

app.listen(PORT, () => {
  console.log(`书虫手记后端服务运行在 http://localhost:${PORT}`);
});
