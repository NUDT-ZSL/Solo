import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const booksPath = join(__dirname, '../data/books.json');
const pagesPath = join(__dirname, '../data/pages.json');

const booksData = JSON.parse(readFileSync(booksPath, 'utf-8'));
const pagesData = JSON.parse(readFileSync(pagesPath, 'utf-8'));

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/api/books', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.json(booksData);
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/search', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const keyword = (req.query.q || '').toLowerCase();
    const results = booksData.filter(
      (book) =>
        book.title.toLowerCase().includes(keyword) ||
        book.author.toLowerCase().includes(keyword)
    );
    res.json(results);
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/:id/pages/:page', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { id, page } = req.params;
    const pageIndex = parseInt(page, 10);
    const bookPages = pagesData[id];
    if (!bookPages || bookPages[pageIndex] === undefined) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json(bookPages[pageIndex]);
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
