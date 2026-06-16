const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readData, writeData } = require('../utils/fileStorage');

const router = express.Router();

router.get('/', (_req, res) => {
  const books = readData('books.json');
  const sorted = books.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sorted);
});

router.get('/recent', (_req, res) => {
  const books = readData('books.json');
  const recent = books
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  res.json(recent);
});

router.get('/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const books = readData('books.json');
  const result = books.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
  );
  res.json(result);
});

router.get('/:id', (req, res) => {
  const books = readData('books.json');
  const book = books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: '图书不存在' });
  res.json(book);
});

router.post('/', (req, res) => {
  const books = readData('books.json');
  const newBook = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  books.push(newBook);
  writeData('books.json', books);
  res.json(newBook);
});

module.exports = router;
