import express, { Request, Response } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataPath = join(__dirname, '..', 'data.json');

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

interface DataStore {
  books: Book[];
  records: DiaryRecord[];
  nextId: number;
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

const loadData = (): DataStore => {
  try {
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  return {
    books: defaultBooks,
    records: [],
    nextId: 1,
  };
};

const saveData = (data: DataStore): void => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving data:', err);
  }
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
    const data = loadData();
    res.json({ success: true, data: { books: data.books } });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/diary', (_req: Request, res: Response) => {
  try {
    const data = loadData();
    const records = [...data.records].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
    const data = loadData();
    const record: DiaryRecord = {
      id: data.nextId,
      bookId,
      duration,
      emotion,
      date: today,
      createdAt: new Date().toISOString(),
    };
    data.records.push(record);
    data.nextId++;
    saveData(data);
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
    const data = loadData();
    const index = data.records.findIndex((r) => r.id === recordId);

    if (index === -1) {
      res.status(404).json({ success: false, error: 'Record not found' });
      return;
    }

    const record = {
      ...data.records[index],
      bookId,
      duration,
      emotion,
    };
    data.records[index] = record;
    saveData(data);
    res.json({ success: true, data: { record } });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/diary/stats', (_req: Request, res: Response) => {
  try {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const data = loadData();
    const dateMap = new Map<string, { emotion: string; duration: number }>();

    const sortedRecords = [...data.records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    sortedRecords.forEach((r) => {
      if (!dateMap.has(r.date)) {
        dateMap.set(r.date, { emotion: r.emotion, duration: r.duration });
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
    const data = loadData();
    const sortedRecords = [...data.records]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    const records = sortedRecords.map((r) => ({ emotion: r.emotion }));

    let category = 'adventure';
    let reason = '根据孩子的阅读习惯为您推荐';

    if (records.length >= 3) {
      const allPositive = records.every((r) => POSITIVE_EMOTIONS.includes(r.emotion));
      const hasNegative = records.some((r) => NEGATIVE_EMOTIONS.includes(r.emotion));

      if (allPositive) {
        category = 'adventure';
        reason = '最近孩子阅读状态很棒！推荐探险类书籍继续保持兴趣';
      } else if (hasNegative) {
        category = 'interactive';
        reason = '发现孩子最近阅读兴趣不高，推荐趣味互动类书籍';
      }
    }

    const recommendedBooks = data.books.filter((b) => b.category === category).slice(0, 4);

    res.json({ books: recommendedBooks, reason });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/diary/clear', (_req: Request, res: Response) => {
  try {
    const data = loadData();
    data.records = [];
    saveData(data);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
