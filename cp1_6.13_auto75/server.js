import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const booksDb = Datastore.create({ filename: './data/books.db', autoload: true });

const seedBooks = [
  {
    id: uuidv4(),
    title: '活着',
    author: '余华',
    category: '文学',
    coverUrl: '',
    status: 'available',
    dueDate: null
  },
  {
    id: uuidv4(),
    title: '三体',
    author: '刘慈欣',
    category: '科幻',
    coverUrl: '',
    status: 'available',
    dueDate: null
  },
  {
    id: uuidv4(),
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    category: '文学',
    coverUrl: '',
    status: 'available',
    dueDate: null
  },
  {
    id: uuidv4(),
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    category: '历史',
    coverUrl: '',
    status: 'available',
    dueDate: null
  },
  {
    id: uuidv4(),
    title: '小王子',
    author: '圣埃克苏佩里',
    category: '童话',
    coverUrl: '',
    status: 'borrowed',
    dueDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD')
  },
  {
    id: uuidv4(),
    title: '围城',
    author: '钱钟书',
    category: '文学',
    coverUrl: '',
    status: 'available',
    dueDate: null
  },
  {
    id: uuidv4(),
    title: '明朝那些事儿',
    author: '当年明月',
    category: '历史',
    coverUrl: '',
    status: 'borrowed',
    dueDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD')
  },
  {
    id: uuidv4(),
    title: '老人与海',
    author: '海明威',
    category: '文学',
    coverUrl: '',
    status: 'available',
    dueDate: null
  },
  {
    id: uuidv4(),
    title: '解忧杂货店',
    author: '东野圭吾',
    category: '小说',
    coverUrl: '',
    status: 'available',
    dueDate: null
  },
  {
    id: uuidv4(),
    title: '时间简史',
    author: '霍金',
    category: '科普',
    coverUrl: '',
    status: 'available',
    dueDate: null
  },
  {
    id: uuidv4(),
    title: '红楼梦',
    author: '曹雪芹',
    category: '古典',
    coverUrl: '',
    status: 'available',
    dueDate: null
  },
  {
    id: uuidv4(),
    title: '挪威的森林',
    author: '村上春树',
    category: '小说',
    coverUrl: '',
    status: 'borrowed',
    dueDate: dayjs().add(5, 'day').format('YYYY-MM-DD')
  }
];

async function initDatabase() {
  const count = await booksDb.count({});
  if (count === 0) {
    await booksDb.insert(seedBooks);
    console.log('数据库已初始化，插入示例图书数据');
  }
}

initDatabase();

app.get('/api/books', async (req, res) => {
  try {
    const books = await booksDb.find({});
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: '获取图书列表失败' });
  }
});

app.post('/api/books/:id/borrow', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await booksDb.findOne({ id });

    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }

    if (book.status === 'borrowed') {
      return res.status(400).json({ error: '图书已被借出' });
    }

    const dueDate = dayjs().add(14, 'day').format('YYYY-MM-DD');
    const updated = await booksDb.update(
      { id },
      { $set: { status: 'borrowed', dueDate } },
      { returnUpdatedDocs: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '预约失败' });
  }
});

app.post('/api/books/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await booksDb.findOne({ id });

    if (!book) {
      return res.status(404).json({ error: '图书不存在' });
    }

    const updated = await booksDb.update(
      { id },
      { $set: { status: 'available', dueDate: null } },
      { returnUpdatedDocs: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '还书失败' });
  }
});

app.get('/api/reminders', async (req, res) => {
  try {
    const books = await booksDb.find({ status: 'borrowed' });
    const today = dayjs();
    const overdue = books.filter(book => {
      if (!book.dueDate) return false;
      return dayjs(book.dueDate).isBefore(today, 'day');
    }).map(book => ({
      ...book,
      overdueDays: Math.abs(dayjs(book.dueDate).diff(today, 'day'))
    }));
    res.json(overdue);
  } catch (err) {
    res.status(500).json({ error: '获取逾期提醒失败' });
  }
});

app.listen(PORT, () => {
  console.log(`BookNest 服务已启动: http://localhost:${PORT}`);
});
