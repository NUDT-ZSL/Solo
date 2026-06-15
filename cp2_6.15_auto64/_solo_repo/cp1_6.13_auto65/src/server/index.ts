import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { addTrailRecord, getTrailByBookId, getTrailsByUser } from './trailManager';

interface BookDoc {
  _id: string;
  title: string;
  author: string;
  coverUrl: string;
  isbn: string;
  ownerName: string;
  ownerId: string;
  currentHolder: string;
  currentHolderName: string;
  status: 'available' | 'borrowed';
  borrowedAt: string | null;
  dueDate: string | null;
  qrCode: string;
  createdAt: string;
}

interface UserDoc {
  _id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

const dataDir = path.join(__dirname, '../../data');

const app = express();
app.use(cors());
app.use(express.json());

const booksDb = Datastore.create({
  filename: path.join(dataDir, 'books.db'),
  autoload: true,
});

const usersDb = Datastore.create({
  filename: path.join(dataDir, 'users.db'),
  autoload: true,
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (!name || !phone || !address) {
      res.status(400).json({ error: '姓名、手机号和门牌号均为必填' });
      return;
    }
    const existing = await usersDb.findOne({ phone });
    if (existing) {
      res.status(409).json({ error: '该手机号已注册' });
      return;
    }
    const user: UserDoc = {
      _id: uuidv4(),
      name,
      phone,
      address,
      createdAt: new Date().toISOString(),
    };
    await usersDb.insert(user);
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: '手机号必填' });
      return;
    }
    const user = await usersDb.findOne({ phone }) as UserDoc | null;
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books', async (_req, res) => {
  try {
    const books = await booksDb.find({}).sort({ createdAt: -1 }).exec() as BookDoc[];
    res.json(books);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const { title, author, coverUrl, isbn, ownerName, ownerId } = req.body;
    if (!title || !author) {
      res.status(400).json({ error: '书名和作者为必填' });
      return;
    }
    const book: BookDoc = {
      _id: uuidv4(),
      title,
      author,
      coverUrl: coverUrl || '',
      isbn: isbn || '',
      ownerName: ownerName || '',
      ownerId: ownerId || '',
      currentHolder: ownerId || '',
      currentHolderName: ownerName || '',
      status: 'available',
      borrowedAt: null,
      dueDate: null,
      qrCode: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    const doc = await booksDb.insert(book) as BookDoc;
    await addTrailRecord({
      bookId: doc._id,
      fromUser: '',
      toUser: ownerId || '',
      action: 'register',
      timestamp: new Date().toISOString(),
    });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/books/borrow', async (req, res) => {
  try {
    const { bookId, borrowerId, borrowerName, lenderId } = req.body;
    if (!bookId || !borrowerId || !borrowerName) {
      res.status(400).json({ error: '缺少借阅必要参数' });
      return;
    }
    const book = await booksDb.findOne({ _id: bookId }) as BookDoc | null;
    if (!book) {
      res.status(404).json({ error: '图书不存在' });
      return;
    }
    if (book.status === 'borrowed') {
      res.status(409).json({ error: '该图书已被借出' });
      return;
    }
    const borrowedAt = new Date().toISOString();
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await booksDb.update(
      { _id: bookId },
      {
        $set: {
          status: 'borrowed',
          currentHolder: borrowerId,
          currentHolderName: borrowerName,
          borrowedAt,
          dueDate,
        },
      }
    );
    await addTrailRecord({
      bookId,
      fromUser: lenderId || book.ownerId,
      toUser: borrowerId,
      action: 'borrow',
      timestamp: borrowedAt,
    });
    const updatedBook = await booksDb.findOne({ _id: bookId }) as BookDoc;
    res.json(updatedBook);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/books/return', async (req, res) => {
  try {
    const { bookId, returnerId } = req.body;
    if (!bookId || !returnerId) {
      res.status(400).json({ error: '缺少归还必要参数' });
      return;
    }
    const book = await booksDb.findOne({ _id: bookId }) as BookDoc | null;
    if (!book) {
      res.status(404).json({ error: '图书不存在' });
      return;
    }
    const returnTime = new Date().toISOString();
    await booksDb.update(
      { _id: bookId },
      {
        $set: {
          status: 'available',
          currentHolder: book.ownerId,
          currentHolderName: book.ownerName,
          borrowedAt: null,
          dueDate: null,
        },
      }
    );
    await addTrailRecord({
      bookId,
      fromUser: returnerId,
      toUser: book.ownerId,
      action: 'return',
      timestamp: returnTime,
    });
    const updatedBook = await booksDb.findOne({ _id: bookId }) as BookDoc;
    res.json(updatedBook);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/trail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await booksDb.findOne({ _id: id }) as BookDoc | null;
    if (!book) {
      res.status(404).json({ error: '图书不存在' });
      return;
    }
    const trails = await getTrailByBookId(id);
    res.json({ book, trails });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/overdue', async (req, res) => {
  try {
    const { userId } = req.query;
    const allBorrowed = await booksDb.find({ status: 'borrowed' }).exec() as BookDoc[];
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    let overdueBooks = allBorrowed.filter((b) => {
      if (!b.dueDate) return false;
      const dueTime = new Date(b.dueDate).getTime();
      return dueTime - now <= threeDaysMs;
    });
    if (userId) {
      overdueBooks = overdueBooks.filter((b) => b.currentHolder === userId);
    }
    res.json(overdueBooks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id/borrowed', async (req, res) => {
  try {
    const { id } = req.params;
    const borrowedBooks = await booksDb.find({ currentHolder: id, status: 'borrowed' }).exec() as BookDoc[];
    res.json(borrowedBooks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`BookTrail server running on http://localhost:${PORT}`);
});
