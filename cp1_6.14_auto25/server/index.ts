import express, { Request, Response } from 'express';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const dbDir = path.join(__dirname, '..', '.data');
const booksDB = Datastore.create({ filename: path.join(dbDir, 'books.db'), autoload: true });
const notesDB = Datastore.create({ filename: path.join(dbDir, 'notes.db'), autoload: true });
const membersDB = Datastore.create({ filename: path.join(dbDir, 'members.db'), autoload: true });
const remindersDB = Datastore.create({ filename: path.join(dbDir, 'reminders.db'), autoload: true });

async function seedIfEmpty() {
  const bookCount = await booksDB.count({});
  if (bookCount === 0) {
    const books = [
      {
        _id: 'book-1',
        title: '百年孤独',
        author: '加西亚·马尔克斯',
        coverColor: '#d4a373',
        progress: 62,
        totalPages: 360,
      },
      {
        _id: 'book-2',
        title: '三体',
        author: '刘慈欣',
        coverColor: '#cda87c',
        progress: 38,
        totalPages: 302,
      },
      {
        _id: 'book-3',
        title: '活着',
        author: '余华',
        coverColor: '#b88a5e',
        progress: 85,
        totalPages: 191,
      },
    ];
    await booksDB.insert(books);

    const members = [
      { _id: 'u1', nickname: '张三', avatarColor: '#e07a5f', bookStatuses: { 'book-1': 'reading', 'book-2': 'unread', 'book-3': 'read' } },
      { _id: 'u2', nickname: '李四', avatarColor: '#81b29a', bookStatuses: { 'book-1': 'reading', 'book-2': 'reading', 'book-3': 'read' } },
      { _id: 'u3', nickname: '王五', avatarColor: '#3d405b', bookStatuses: { 'book-1': 'unread', 'book-2': 'reading', 'book-3': 'reading' } },
      { _id: 'u4', nickname: '赵六', avatarColor: '#f2cc8f', bookStatuses: { 'book-1': 'read', 'book-2': 'unread', 'book-3': 'reading' } },
      { _id: 'u5', nickname: '孙七', avatarColor: '#e56b6f', bookStatuses: { 'book-1': 'reading', 'book-2': 'read', 'book-3': 'unread' } },
    ];
    await membersDB.insert(members);

    const now = Date.now();
    const notes = [
      {
        _id: uuidv4(),
        bookId: 'book-1',
        userId: 'u1',
        userName: '张三',
        userAvatarColor: '#e07a5f',
        content: '马孔多的雨天描写太有画面感了，仿佛能闻到潮湿的泥土气息。',
        quote: '多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。',
        createdAt: now - 3600_000,
      },
      {
        _id: uuidv4(),
        bookId: 'book-1',
        userId: 'u2',
        userName: '李四',
        userAvatarColor: '#81b29a',
        content: '家族七代人的命运轮回，读起来既沉重又着迷。',
        quote: '生命中曾经有过的所有灿烂，原来终究都需要用寂寞来偿还。',
        createdAt: now - 7200_000,
      },
      {
        _id: uuidv4(),
        bookId: 'book-2',
        userId: 'u3',
        userName: '王五',
        userAvatarColor: '#3d405b',
        content: '黑暗森林法则的推理过程太精彩了，宇宙社会学的设定震撼人心。',
        quote: '宇宙就是一座黑暗森林，每个文明都是带枪的猎人。',
        createdAt: now - 1800_000,
      },
      {
        _id: uuidv4(),
        bookId: 'book-3',
        userId: 'u4',
        userName: '赵六',
        userAvatarColor: '#f2cc8f',
        content: '福贵的一生让人落泪，但那种生命的韧性也让人肃然起敬。',
        quote: '人是为活着本身而活着的，而不是为了活着之外的任何事物所活着。',
        createdAt: now - 5400_000,
      },
    ];
    await notesDB.insert(notes);

    const reminders = [
      { _id: uuidv4(), userId: 'u1', userName: '张三', bookId: 'book-1', bookTitle: '百年孤独', createdAt: now - 600_000 },
      { _id: uuidv4(), userId: 'u3', userName: '王五', bookId: 'book-2', bookTitle: '三体', createdAt: now - 1200_000 },
      { _id: uuidv4(), userId: 'u2', userName: '李四', bookId: 'book-3', bookTitle: '活着', createdAt: now - 1800_000 },
    ];
    await remindersDB.insert(reminders);
  }
}

seedIfEmpty();

app.get('/api/books', async (_req: Request, res: Response) => {
  try {
    const books = await booksDB.find({}).sort({ title: 1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/books/:id', async (req: Request, res: Response) => {
  try {
    const book = await booksDB.findOne({ _id: req.params.id });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/books/:id/notes', async (req: Request, res: Response) => {
  try {
    const bookId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 0;
    const skip = parseInt(req.query.skip as string) || 0;

    const query = notesDB.find({ bookId }).sort({ createdAt: -1 });
    let notes;
    let total;
    if (limit > 0) {
      notes = await query.skip(skip).limit(limit);
      total = await notesDB.count({ bookId });
    } else {
      notes = await query;
      total = notes.length;
    }
    res.json({ notes, total, hasMore: skip + notes.length < total });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/books/:id/notes', async (req: Request, res: Response) => {
  try {
    const { userId, content, quote } = req.body;
    const user = await membersDB.findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const book = await booksDB.findOne({ _id: req.params.id });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const note = {
      _id: uuidv4(),
      bookId: req.params.id,
      userId: user._id,
      userName: user.nickname,
      userAvatarColor: user.avatarColor,
      content,
      quote: quote || '',
      createdAt: Date.now(),
    };
    const inserted = await notesDB.insert(note);
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/members', async (_req: Request, res: Response) => {
  try {
    const members = await membersDB.find({});
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/books/:id/members', async (req: Request, res: Response) => {
  try {
    const bookId = req.params.id;
    const members = await membersDB.find({});
    const result = members.map((m: any) => ({
      _id: m._id,
      nickname: m.nickname,
      avatarColor: m.avatarColor,
      status: m.bookStatuses?.[bookId] || 'unread',
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/reminders', async (_req: Request, res: Response) => {
  try {
    const reminders = await remindersDB.find({}).sort({ createdAt: -1 }).limit(10);
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/reminders', async (req: Request, res: Response) => {
  try {
    const { userId, bookId } = req.body;
    const user = await membersDB.findOne({ _id: userId });
    const book = await booksDB.findOne({ _id: bookId });
    if (!user || !book) return res.status(404).json({ error: 'User or Book not found' });

    const reminder = {
      _id: uuidv4(),
      userId: user._id,
      userName: user.nickname,
      bookId: book._id,
      bookTitle: book.title,
      createdAt: Date.now(),
    };
    const inserted = await remindersDB.insert(reminder);
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.patch('/api/members/:userId/status', async (req: Request, res: Response) => {
  try {
    const { bookId, status } = req.body;
    const member = await membersDB.findOne({ _id: req.params.userId });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const bookStatuses = { ...(member as any).bookStatuses, [bookId]: status };
    const updated = await membersDB.update({ _id: req.params.userId }, { $set: { bookStatuses } }, { returnUpdatedDocs: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] ShelfMate API running at http://localhost:${PORT}`);
});
