import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readJSON<T>(filename: string): T {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) return [] as unknown as T;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON<T>(filename: string, data: T): void {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function initData() {
  const usersPath = path.join(dataDir, 'users.json');
  if (!fs.existsSync(usersPath)) {
    const adminUser = {
      id: uuidv4(),
      nickname: '管理员',
      email: 'admin@example.com',
      password: 'admin123',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      points: 0,
      isAdmin: true,
      createdAt: new Date().toISOString(),
    };
    const sampleUsers = [
      {
        id: uuidv4(),
        nickname: '书虫小明',
        email: 'xiaoming@example.com',
        password: '123456',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
        points: 30,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        nickname: '文艺青年',
        email: 'wenyi@example.com',
        password: '123456',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wenyi',
        points: 20,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      },
    ];
    writeJSON('users.json', [adminUser, ...sampleUsers]);
  }

  const booksPath = path.join(dataDir, 'books.json');
  if (!fs.existsSync(booksPath)) {
    const users = readJSON<any[]>('users.json');
    const sampleBooks = [
      {
        id: uuidv4(),
        title: '百年孤独',
        author: '加西亚·马尔克斯',
        isbn: '9787544253994',
        coverUrl: 'https://picsum.photos/seed/book1/300/420',
        condition: '九成新，无笔记划痕',
        ownerId: users[1].id,
        createdAt: dayjs().subtract(1, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '三体',
        author: '刘慈欣',
        isbn: '9787536692930',
        coverUrl: 'https://picsum.photos/seed/book2/300/420',
        condition: '八成新，扉页有签名',
        ownerId: users[2].id,
        createdAt: dayjs().subtract(2, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '活着',
        author: '余华',
        isbn: '9787506365437',
        coverUrl: 'https://picsum.photos/seed/book3/300/420',
        condition: '十成新，刚拆封',
        ownerId: users[1].id,
        createdAt: dayjs().subtract(3, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '围城',
        author: '钱钟书',
        isbn: '9787020024759',
        coverUrl: 'https://picsum.photos/seed/book4/300/420',
        condition: '七成新，略有泛黄',
        ownerId: users[2].id,
        createdAt: dayjs().subtract(4, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '小王子',
        author: '圣埃克苏佩里',
        isbn: '9787020042494',
        coverUrl: 'https://picsum.photos/seed/book5/300/420',
        condition: '九成新，精装版',
        ownerId: users[1].id,
        createdAt: dayjs().subtract(5, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '1984',
        author: '乔治·奥威尔',
        isbn: '9787540426125',
        coverUrl: 'https://picsum.photos/seed/book6/300/420',
        condition: '八成新',
        ownerId: users[2].id,
        createdAt: dayjs().subtract(6, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '平凡的世界',
        author: '路遥',
        isbn: '9787530212004',
        coverUrl: 'https://picsum.photos/seed/book7/300/420',
        condition: '九成新，三册全套',
        ownerId: users[1].id,
        createdAt: dayjs().subtract(7, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '红楼梦',
        author: '曹雪芹',
        isbn: '9787020002207',
        coverUrl: 'https://picsum.photos/seed/book8/300/420',
        condition: '精装典藏版，全新',
        ownerId: users[2].id,
        createdAt: dayjs().subtract(8, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '人类简史',
        author: '尤瓦尔·赫拉利',
        isbn: '9787508647357',
        coverUrl: 'https://picsum.photos/seed/book9/300/420',
        condition: '八成新，略有批注',
        ownerId: users[1].id,
        createdAt: dayjs().subtract(9, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '挪威的森林',
        author: '村上春树',
        isbn: '9787532732968',
        coverUrl: 'https://picsum.photos/seed/book10/300/420',
        condition: '九成新',
        ownerId: users[2].id,
        createdAt: dayjs().subtract(10, 'day').toISOString(),
      },
    ];
    writeJSON('books.json', sampleBooks);
  }

  const exchangesPath = path.join(dataDir, 'exchanges.json');
  if (!fs.existsSync(exchangesPath)) {
    writeJSON('exchanges.json', { requests: [], records: [] });
  }
}

initData();

app.post('/api/users/register', (req, res) => {
  const { nickname, email, password } = req.body;
  const users = readJSON<any[]>('users.json');
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: '该邮箱已注册' });
  }
  const newUser = {
    id: uuidv4(),
    nickname,
    email,
    password,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nickname)}`,
    points: 0,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeJSON('users.json', users);
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ user: userWithoutPassword, token: newUser.id });
});

app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  const users = readJSON<any[]>('users.json');
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(400).json({ error: '邮箱或密码错误' });
  }
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword, token: user.id });
});

app.get('/api/users/:id', (req, res) => {
  const users = readJSON<any[]>('users.json');
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.put('/api/users/:id', (req, res) => {
  const users = readJSON<any[]>('users.json');
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });
  users[idx] = { ...users[idx], ...req.body };
  writeJSON('users.json', users);
  const { password: _, ...userWithoutPassword } = users[idx];
  res.json(userWithoutPassword);
});

app.get('/api/books', (req, res) => {
  const books = readJSON<any[]>('books.json');
  res.json(books.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.get('/api/books/recent', (req, res) => {
  const books = readJSON<any[]>('books.json');
  const recent = books
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  res.json(recent);
});

app.get('/api/books/search', (req, res) => {
  const q = (req.query.q as string)?.toLowerCase() || '';
  const books = readJSON<any[]>('books.json');
  const result = books.filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
  );
  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const books = readJSON<any[]>('books.json');
  const book = books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: '图书不存在' });
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const books = readJSON<any[]>('books.json');
  const newBook = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  books.push(newBook);
  writeJSON('books.json', books);
  res.json(newBook);
});

app.get('/api/exchanges', (req, res) => {
  const userId = req.query.userId as string;
  const data = readJSON<any>('exchanges.json');
  const userRecords = data.records.filter(
    (r: any) => r.currentHolderId === userId || r.previousHolderId === userId
  );
  res.json(userRecords);
});

app.get('/api/exchanges/recent', (req, res) => {
  const data = readJSON<any>('exchanges.json');
  const recent = data.records
    .sort((a: any, b: any) => new Date(b.lentAt).getTime() - new Date(a.lentAt).getTime())
    .slice(0, 3);
  res.json(recent);
});

app.get('/api/exchanges/requests', (req, res) => {
  const userId = req.query.userId as string;
  const data = readJSON<any>('exchanges.json');
  const pendingRequests = data.requests.filter(
    (r: any) => r.ownerId === userId && r.status === 'pending'
  );
  res.json(pendingRequests);
});

app.post('/api/exchanges/request', (req, res) => {
  const data = readJSON<any>('exchanges.json');
  const { bookId, requesterId, ownerId } = req.body;
  if (requesterId === ownerId) {
    return res.status(400).json({ error: '不能请求自己的图书' });
  }
  const exists = data.requests.find(
    (r: any) =>
      r.bookId === bookId &&
      r.requesterId === requesterId &&
      r.status === 'pending'
  );
  if (exists) {
    return res.status(400).json({ error: '已有待处理的请求' });
  }
  const newRequest = {
    id: uuidv4(),
    bookId,
    requesterId,
    ownerId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  data.requests.push(newRequest);
  writeJSON('exchanges.json', data);
  res.json(newRequest);
});

app.put('/api/exchanges/:id/respond', (req, res) => {
  const data = readJSON<any>('exchanges.json');
  const { accept } = req.body;
  const reqIdx = data.requests.findIndex((r: any) => r.id === req.params.id);
  if (reqIdx === -1) return res.status(404).json({ error: '请求不存在' });

  data.requests[reqIdx].status = accept ? 'accepted' : 'rejected';

  if (accept) {
    const request = data.requests[reqIdx];
    const newRecord = {
      id: uuidv4(),
      bookId: request.bookId,
      currentHolderId: request.requesterId,
      previousHolderId: request.ownerId,
      lentAt: new Date().toISOString(),
      expectedReturnAt: dayjs().add(30, 'day').toISOString(),
      returnedAt: null,
      status: 'active',
      chain: [
        {
          fromUserId: request.ownerId,
          toUserId: request.requesterId,
          timestamp: new Date().toISOString(),
          note: '初次交换',
        },
      ],
    };
    data.records.push(newRecord);

    const users = readJSON<any[]>('users.json');
    const ownerIdx = users.findIndex((u) => u.id === request.ownerId);
    const requesterIdx = users.findIndex((u) => u.id === request.requesterId);
    if (ownerIdx !== -1) users[ownerIdx].points += 10;
    if (requesterIdx !== -1) users[requesterIdx].points += 10;
    writeJSON('users.json', users);

    const books = readJSON<any[]>('books.json');
    const bookIdx = books.findIndex((b) => b.id === request.bookId);
    if (bookIdx !== -1) books[bookIdx].ownerId = request.requesterId;
    writeJSON('books.json', books);
  }

  writeJSON('exchanges.json', data);
  res.json({ success: true });
});

app.get('/api/exchanges/:id/history', (req, res) => {
  const data = readJSON<any>('exchanges.json');
  const record = data.records.find((r: any) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: '记录不存在' });
  res.json(record.chain);
});

app.put('/api/exchanges/:id/close', (req, res) => {
  const data = readJSON<any>('exchanges.json');
  const idx = data.records.findIndex((r: any) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '记录不存在' });
  data.records[idx].status = 'closed';
  data.records[idx].returnedAt = new Date().toISOString();
  writeJSON('exchanges.json', data);
  res.json(data.records[idx]);
});

app.get('/api/admin/stats', (req, res) => {
  const books = readJSON<any[]>('books.json');
  const data = readJSON<any>('exchanges.json');
  const activeCount = data.records.filter((r: any) => r.status === 'active').length;
  const completedCount = data.records.filter(
    (r: any) => r.status === 'completed' || r.status === 'closed'
  ).length;
  res.json({
    totalBooks: books.length,
    activeExchanges: activeCount,
    completedExchanges: completedCount,
  });
});

app.get('/api/admin/records', (req, res) => {
  const data = readJSON<any>('exchanges.json');
  res.json(data.records);
});

app.get('/api/users', (req, res) => {
  const users = readJSON<any[]>('users.json');
  const result = users.map(({ password, ...rest }) => rest);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
