import express, { Request, Response } from 'express';
import cors from 'cors';
import initSqlJs, { type SqlValue } from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dbPath = join(__dirname, '..', 'diary.db');

interface Book {
  id: string;
  title: string;
  category: string;
  coverGradient: string;
}

interface DiaryRecord {
  id: number;
  bookId: string;
  duration: number;
  emotion: string;
  date: string;
  createdAt: string;
}

const defaultBooks: Book[] = [
  { id: 'book-001', title: '小王子', category: 'adventure', coverGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'book-002', title: '夏洛的网', category: 'adventure', coverGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'book-003', title: '神奇校车', category: 'interactive', coverGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'book-004', title: '猜猜我有多爱你', category: 'interactive', coverGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'book-005', title: '绿野仙踪', category: 'adventure', coverGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'book-006', title: '爷爷一定有办法', category: 'interactive', coverGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { id: 'book-007', title: '海底两万里', category: 'adventure', coverGradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
];

let db: initSqlJs.Database | null = null;

const saveDatabase = (database: initSqlJs.Database): void => {
  try {
    const data = database.export();
    fs.writeFileSync(dbPath, data);
  } catch (err) {
    console.error('Error saving database:', err);
  }
};

const initDatabase = async (): Promise<initSqlJs.Database> => {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      const database = new SQL.Database(fileBuffer);
      return database;
    } catch (err) {
      console.error('Error loading existing database, creating new one:', err);
    }
  }

  const database = new SQL.Database();

  database.run(`
    CREATE TABLE IF NOT EXISTS books (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(50) NOT NULL,
      cover_gradient VARCHAR(200) NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS diary_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id VARCHAR(50) NOT NULL,
      duration INTEGER NOT NULL,
      emotion VARCHAR(20) NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run('CREATE INDEX IF NOT EXISTS idx_diary_date ON diary_records(date)');
  database.run('CREATE INDEX IF NOT EXISTS idx_diary_created ON diary_records(created_at DESC)');

  const insertBookStmt = database.prepare(
    'INSERT OR IGNORE INTO books (id, title, category, cover_gradient) VALUES (?, ?, ?, ?)'
  );

  defaultBooks.forEach((book) => {
    insertBookStmt.run([book.id, book.title, book.category, book.coverGradient]);
  });
  insertBookStmt.free();

  saveDatabase(database);
  return database;
};

const emotionLevels: Record<string, number> = {
  happy: 5,
  calm: 4,
  bored: 3,
  irritated: 2,
  crying: 1,
};

const POSITIVE_EMOTIONS = ['happy', 'calm'];
const NEGATIVE_EMOTIONS = ['bored', 'irritated', 'crying'];

app.get('/api/books', (_req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM books');
    const rows = result[0]?.values || [];
    const books = rows.map((row: SqlValue[]) => ({
      id: row[0] as string,
      title: row[1] as string,
      category: row[2] as string,
      coverGradient: row[3] as string,
    }));
    res.json({ success: true, data: { books } });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/diary', (_req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized');
    const result = db.exec('SELECT * FROM diary_records ORDER BY created_at DESC');
    const rows = result[0]?.values || [];
    const records = rows.map((row: SqlValue[]) => ({
      id: row[0] as number,
      bookId: row[1] as string,
      duration: row[2] as number,
      emotion: row[3] as string,
      date: row[4] as string,
      createdAt: row[5] as string,
    }));
    res.json({ success: true, data: { records } });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/diary', (req: Request, res: Response) => {
  const { bookId, duration, emotion } = req.body;
  const today = new Date().toISOString().split('T')[0];

  if (!bookId || !duration || !emotion) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  if (!emotionLevels[emotion]) {
    res.status(400).json({ success: false, error: 'Invalid emotion type' });
    return;
  }

  if (duration < 5 || duration > 60) {
    res.status(400).json({ success: false, error: 'Duration must be between 5 and 60 minutes' });
    return;
  }

  try {
    if (!db) throw new Error('Database not initialized');
    const createdAt = new Date().toISOString();
    db.run(
      'INSERT INTO diary_records (book_id, duration, emotion, date, created_at) VALUES (?, ?, ?, ?, ?)',
      [bookId, duration, emotion, today, createdAt]
    );
    const result = db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0] as number;
    const record: DiaryRecord = {
      id,
      bookId,
      duration,
      emotion,
      date: today,
      createdAt,
    };
    saveDatabase(db);
    res.json({ success: true, data: { record } });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/diary/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { bookId, duration, emotion } = req.body;
  const recordId = parseInt(id, 10);

  if (!bookId || !duration || !emotion) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  if (!emotionLevels[emotion]) {
    res.status(400).json({ success: false, error: 'Invalid emotion type' });
    return;
  }

  if (duration < 5 || duration > 60) {
    res.status(400).json({ success: false, error: 'Duration must be between 5 and 60 minutes' });
    return;
  }

  try {
    if (!db) throw new Error('Database not initialized');
    const result = db.run(
      'UPDATE diary_records SET book_id = ?, duration = ?, emotion = ? WHERE id = ?',
      [bookId, duration, emotion, recordId]
    );

    if (result.getRowsModified() === 0) {
      res.status(404).json({ success: false, error: 'Record not found' });
      return;
    }

    const queryResult = db.exec('SELECT * FROM diary_records WHERE id = ?', [recordId]);
    const row = queryResult[0]?.values[0];
    if (!row) {
      res.status(404).json({ success: false, error: 'Record not found' });
      return;
    }

    const record: DiaryRecord = {
      id: row[0] as number,
      bookId: row[1] as string,
      duration: row[2] as number,
      emotion: row[3] as string,
      date: row[4] as string,
      createdAt: row[5] as string,
    };
    saveDatabase(db);
    res.json({ success: true, data: { record } });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/diary/stats', (_req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized');

    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const placeholders = dates.map(() => '?').join(',');
    const result = db.exec(
      `SELECT date, emotion, duration, created_at
       FROM diary_records
       WHERE date IN (${placeholders})
       ORDER BY created_at DESC`,
      dates
    );

    const rows = result[0]?.values || [];
    const dateMap = new Map<string, { emotion: string; duration: number }>();

    rows.forEach((row: SqlValue[]) => {
      const date = row[0] as string;
      const emotion = row[1] as string;
      const duration = row[2] as number;
      if (!dateMap.has(date)) {
        dateMap.set(date, { emotion, duration });
      }
    });

    const stats = dates.map((date) => {
      const entry = dateMap.get(date);
      const emotion = entry?.emotion || 'calm';
      const duration = entry?.duration || 0;
      return {
        date,
        emotion,
        emotionLevel: emotionLevels[emotion],
        duration,
      };
    });

    res.json({ success: true, data: { stats } });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/diary/recommendation', (_req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized');

    const result = db.exec(
      'SELECT emotion FROM diary_records ORDER BY created_at DESC LIMIT 3'
    );

    const rows = result[0]?.values || [];
    const records = rows.map((row: SqlValue[]) => ({ emotion: row[0] as string }));

    let category = 'adventure';
    let reason = '根据孩子的阅读习惯为您推荐';

    if (records.length >= 3) {
      const allPositive = records.every((r: { emotion: string }) => POSITIVE_EMOTIONS.includes(r.emotion));
      const hasNegative = records.some((r: { emotion: string }) => NEGATIVE_EMOTIONS.includes(r.emotion));

      if (allPositive) {
        category = 'adventure';
        reason = '最近孩子阅读状态很棒！推荐探险类书籍继续保持兴趣';
      } else if (hasNegative) {
        category = 'interactive';
        reason = '发现孩子最近阅读兴趣不高，推荐趣味互动类书籍';
      }
    }

    const booksResult = db.exec(
      'SELECT * FROM books WHERE category = ? LIMIT 4',
      [category]
    );

    const bookRows = booksResult[0]?.values || [];
    const recommendedBooks = bookRows.map((row: SqlValue[]) => ({
      id: row[0] as string,
      title: row[1] as string,
      category: row[2] as string,
      coverGradient: row[3] as string,
    }));

    res.json({ books: recommendedBooks, reason });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/diary/clear', (_req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized');
    db.run('DELETE FROM diary_records');
    saveDatabase(db);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

initDatabase().then((database) => {
  db = database;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
