import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Book, DriftRecord, Application, BooksData, DriftRecordsData, BookStatus } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const booksFilePath = path.join(dataDir, 'books.json');
const driftRecordsFilePath = path.join(dataDir, 'driftRecords.json');

function readBooksData(): BooksData {
  const rawData = fs.readFileSync(booksFilePath, 'utf-8');
  return JSON.parse(rawData);
}

function writeBooksData(data: BooksData): void {
  fs.writeFileSync(booksFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

function readDriftRecordsData(): DriftRecordsData {
  const rawData = fs.readFileSync(driftRecordsFilePath, 'utf-8');
  return JSON.parse(rawData);
}

function writeDriftRecordsData(data: DriftRecordsData): void {
  fs.writeFileSync(driftRecordsFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/books', (req, res) => {
  const { search, sortBy } = req.query;
  let { books } = readBooksData();

  if (search && typeof search === 'string') {
    const keyword = search.toLowerCase();
    books = books.filter(
      (book) =>
        book.title.toLowerCase().includes(keyword) ||
        book.author.toLowerCase().includes(keyword)
    );
  }

  if (sortBy === 'publishTime') {
    books = [...books].sort(
      (a, b) => new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime()
    );
  } else if (sortBy === 'driftCount') {
    books = [...books].sort((a, b) => b.driftCount - a.driftCount);
  }

  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const { books } = readBooksData();
  const book = books.find((b) => b.id === id);

  if (!book) {
    res.status(404).json({ error: '图书不存在' });
    return;
  }

  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { books } = readBooksData();
  const newBook: Book = {
    id: uuidv4(),
    title: req.body.title,
    author: req.body.author,
    coverUrl: req.body.coverUrl,
    description: req.body.description,
    publishInfo: req.body.publishInfo,
    status: 'available',
    publishTime: new Date().toISOString(),
    driftCount: 0,
    currentHolder: req.body.publisherName,
    publisherId: req.body.publisherId,
    publisherName: req.body.publisherName,
    applications: [],
  };

  books.unshift(newBook);
  writeBooksData({ books });

  const { records } = readDriftRecordsData();
  const initialRecord: DriftRecord = {
    id: uuidv4(),
    bookId: newBook.id,
    fromLocation: '发布地',
    toLocation: req.body.publisherName,
    time: new Date().toISOString(),
    holderName: req.body.publisherName,
    status: 'start',
  };
  records.push(initialRecord);
  writeDriftRecordsData({ records });

  res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const { books } = readBooksData();
  const bookIndex = books.findIndex((b) => b.id === id);

  if (bookIndex === -1) {
    res.status(404).json({ error: '图书不存在' });
    return;
  }

  books[bookIndex] = { ...books[bookIndex], ...req.body };
  writeBooksData({ books });

  res.json(books[bookIndex]);
});

app.delete('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const { books } = readBooksData();
  const bookIndex = books.findIndex((b) => b.id === id);

  if (bookIndex === -1) {
    res.status(404).json({ error: '图书不存在' });
    return;
  }

  books.splice(bookIndex, 1);
  writeBooksData({ books });

  res.json({ success: true });
});

app.get('/api/books/:id/drift-records', (req, res) => {
  const { id } = req.params;
  const { records } = readDriftRecordsData();
  const bookRecords = records
    .filter((r) => r.bookId === id)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  res.json(bookRecords);
});

app.post('/api/books/:id/apply', (req, res) => {
  const { id } = req.params;
  const { applicantId, applicantName, location } = req.body;

  const { books } = readBooksData();
  const bookIndex = books.findIndex((b) => b.id === id);

  if (bookIndex === -1) {
    res.status(404).json({ success: false, message: '图书不存在' });
    return;
  }

  if (books[bookIndex].status !== 'available') {
    res.status(400).json({ success: false, message: '该图书当前不可申请' });
    return;
  }

  const application: Application = {
    id: uuidv4(),
    bookId: id,
    bookTitle: books[bookIndex].title,
    applicantId,
    applicantName,
    status: 'pending',
    applyTime: new Date().toISOString(),
    location,
  };

  books[bookIndex].applications.push(application);
  books[bookIndex].status = 'drifting';
  books[bookIndex].currentHolder = applicantName;
  books[bookIndex].driftCount += 1;

  const { records } = readDriftRecordsData();
  const bookRecords = records
    .filter((r) => r.bookId === id)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  bookRecords.forEach((r) => {
    if (r.status === 'current') {
      r.status = 'middle';
    }
  });

  const lastRecord = bookRecords[bookRecords.length - 1];
  const newRecord: DriftRecord = {
    id: uuidv4(),
    bookId: id,
    fromLocation: lastRecord ? lastRecord.toLocation : '未知地点',
    toLocation: location,
    time: new Date().toISOString(),
    holderName: applicantName,
    status: 'current',
  };

  records.push(newRecord);
  writeBooksData({ books });
  writeDriftRecordsData({ records });

  res.json({ success: true, message: '漂流申请成功！' });
});

app.get('/api/books/publisher/:publisherId', (req, res) => {
  const { publisherId } = req.params;
  const { books } = readBooksData();
  const publisherBooks = books.filter((b) => b.publisherId === publisherId);
  res.json(publisherBooks);
});

app.get('/api/applications/:applicantId', (req, res) => {
  const { applicantId } = req.params;
  const { books } = readBooksData();
  const applications: Application[] = [];

  books.forEach((book) => {
    book.applications.forEach((app) => {
      if (app.applicantId === applicantId) {
        applications.push(app);
      }
    });
  });

  applications.sort(
    (a, b) => new Date(b.applyTime).getTime() - new Date(a.applyTime).getTime()
  );

  res.json(applications);
});

app.put('/api/books/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: BookStatus };

  const { books } = readBooksData();
  const bookIndex = books.findIndex((b) => b.id === id);

  if (bookIndex === -1) {
    res.status(404).json({ error: '图书不存在' });
    return;
  }

  books[bookIndex].status = status;
  writeBooksData({ books });

  res.json(books[bookIndex]);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
