const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const app = express();
const PORT = 3010;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, '../src/data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const RECORDS_FILE = path.join(DATA_DIR, 'borrowRecords.json');
const INITIAL_BOOKS_FILE = path.join(DATA_DIR, 'initialBooks.json');

function readJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

if (!fs.existsSync(INITIAL_BOOKS_FILE)) {
  const books = readJSON(BOOKS_FILE);
  writeJSON(INITIAL_BOOKS_FILE, books);
}

function calculateFine(dueDate, returnDate) {
  const due = dayjs(dueDate);
  const returned = dayjs(returnDate);
  const overdueDays = returned.diff(due, 'day');
  if (overdueDays > 0) {
    return overdueDays * 0.5;
  }
  return 0;
}

app.get('/api/books', (req, res) => {
  try {
    const books = readJSON(BOOKS_FILE);
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: '获取书籍列表失败' });
  }
});

app.post('/api/borrow', (req, res) => {
  try {
    const { bookId, reader } = req.body;

    if (!bookId || !reader || !reader.readerId || !reader.name || !reader.phone) {
      return res.status(400).json({ message: '参数不完整' });
    }

    const books = readJSON(BOOKS_FILE);
    const bookIndex = books.findIndex(b => b.id === bookId);

    if (bookIndex === -1) {
      return res.status(404).json({ message: '书籍不存在' });
    }

    if (books[bookIndex].availableCopies <= 0) {
      return res.status(400).json({ message: '该书暂无库存' });
    }

    const borrowDate = dayjs().format('YYYY-MM-DD');
    const dueDate = dayjs().add(14, 'day').format('YYYY-MM-DD');

    const record = {
      id: uuidv4(),
      bookId: bookId,
      bookTitle: books[bookIndex].title,
      bookIsbn: books[bookIndex].isbn,
      readerId: reader.readerId,
      readerName: reader.name,
      readerPhone: reader.phone,
      borrowDate,
      dueDate
    };

    const records = readJSON(RECORDS_FILE);
    records.push(record);
    writeJSON(RECORDS_FILE, records);

    books[bookIndex].availableCopies -= 1;
    writeJSON(BOOKS_FILE, books);

    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '借阅失败' });
  }
});

app.post('/api/return', (req, res) => {
  try {
    const { recordId } = req.body;

    if (!recordId) {
      return res.status(400).json({ message: '借阅记录ID不能为空' });
    }

    const records = readJSON(RECORDS_FILE);
    const recordIndex = records.findIndex(r => r.id === recordId);

    if (recordIndex === -1) {
      return res.status(404).json({ message: '借阅记录不存在' });
    }

    if (records[recordIndex].returnDate) {
      return res.status(400).json({ message: '该书已归还' });
    }

    const returnDate = dayjs().format('YYYY-MM-DD');
    const fine = calculateFine(records[recordIndex].dueDate, returnDate);

    records[recordIndex].returnDate = returnDate;
    records[recordIndex].fineAmount = fine;
    writeJSON(RECORDS_FILE, records);

    const books = readJSON(BOOKS_FILE);
    const bookIndex = books.findIndex(b => b.id === records[recordIndex].bookId);
    if (bookIndex !== -1) {
      books[bookIndex].availableCopies += 1;
      writeJSON(BOOKS_FILE, books);
    }

    res.json({ record: records[recordIndex], fine });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '归还失败' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const books = readJSON(BOOKS_FILE);
    const records = readJSON(RECORDS_FILE);

    const totalBooks = books.reduce((sum, b) => sum + b.totalCopies, 0);
    const currentlyBorrowed = records.filter(r => !r.returnDate).length;

    const currentMonth = dayjs().format('YYYY-MM');
    const monthlyBorrows = records.filter(
      r => dayjs(r.borrowDate).format('YYYY-MM') === currentMonth
    ).length;

    const totalFines = records.reduce((sum, r) => sum + (r.fineAmount || 0), 0);

    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const count = records.filter(
        r => dayjs(r.borrowDate).format('YYYY-MM-DD') === date
      ).length;
      weeklyTrend.push({ date, count });
    }

    res.json({
      totalBooks,
      currentlyBorrowed,
      monthlyBorrows,
      totalFines,
      weeklyTrend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取统计数据失败' });
  }
});

app.get('/api/history', (req, res) => {
  try {
    const { readerId } = req.query;

    if (!readerId) {
      return res.status(400).json({ message: '读者编号不能为空' });
    }

    const records = readJSON(RECORDS_FILE);
    const readerRecords = records
      .filter(r => r.readerId === readerId)
      .sort((a, b) => dayjs(b.borrowDate).valueOf() - dayjs(a.borrowDate).valueOf());

    res.json(readerRecords);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取借阅历史失败' });
  }
});

app.get('/api/readers', (req, res) => {
  try {
    const records = readJSON(RECORDS_FILE);
    const readerMap = new Map();

    for (const record of records) {
      if (!readerMap.has(record.readerId)) {
        readerMap.set(record.readerId, {
          readerId: record.readerId,
          name: record.readerName,
          phone: record.readerPhone
        });
      }
    }

    const readers = Array.from(readerMap.values());
    res.json(readers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取读者列表失败' });
  }
});

app.get('/api/records/search', (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: '搜索关键词不能为空' });
    }

    const searchTerm = String(query).toLowerCase();
    const records = readJSON(RECORDS_FILE);

    const results = records.filter(r =>
      r.readerName.toLowerCase().includes(searchTerm) ||
      r.bookTitle.toLowerCase().includes(searchTerm)
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '搜索借阅记录失败' });
  }
});

app.post('/api/reset', (req, res) => {
  try {
    const initialBooks = readJSON(INITIAL_BOOKS_FILE);
    writeJSON(BOOKS_FILE, initialBooks);
    writeJSON(RECORDS_FILE, []);
    res.json({ message: '数据已重置' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '重置数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
