const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const usersRouter = require('./routes/users');
const booksRouter = require('./routes/books');
const exchangesRouter = require('./routes/exchanges');

const app = express();
const PORT = 3010;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function ensureDataFiles() {
  const usersPath = path.join(dataDir, 'users.json');
  const booksPath = path.join(dataDir, 'books.json');
  const exchangesPath = path.join(dataDir, 'exchanges.json');

  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, '[]', 'utf-8');
  }
  if (!fs.existsSync(booksPath)) {
    fs.writeFileSync(booksPath, '[]', 'utf-8');
  }
  if (!fs.existsSync(exchangesPath)) {
    fs.writeFileSync(
      exchangesPath,
      JSON.stringify({ requests: [], records: [] }, null, 2),
      'utf-8'
    );
  }
}

function readJSON(filename) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filename, data) {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function initData() {
  ensureDataFiles();
  const usersPath = path.join(dataDir, 'users.json');
  const usersContent = fs.readFileSync(usersPath, 'utf-8');
  const users = JSON.parse(usersContent);

  if (Array.isArray(users) && users.length === 0) {
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

    const booksPath = path.join(dataDir, 'books.json');
    const allUsers = readJSON('users.json');
    const sampleBooks = [
      {
        id: uuidv4(),
        title: '百年孤独',
        author: '加西亚·马尔克斯',
        isbn: '9787544253994',
        coverUrl: 'https://picsum.photos/seed/book1/300/420',
        condition: '九成新，无笔记划痕',
        ownerId: allUsers[1].id,
        createdAt: dayjs().subtract(1, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '三体',
        author: '刘慈欣',
        isbn: '9787536692930',
        coverUrl: 'https://picsum.photos/seed/book2/300/420',
        condition: '八成新，扉页有签名',
        ownerId: allUsers[2].id,
        createdAt: dayjs().subtract(2, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '活着',
        author: '余华',
        isbn: '9787506365437',
        coverUrl: 'https://picsum.photos/seed/book3/300/420',
        condition: '十成新，刚拆封',
        ownerId: allUsers[1].id,
        createdAt: dayjs().subtract(3, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '围城',
        author: '钱钟书',
        isbn: '9787020024759',
        coverUrl: 'https://picsum.photos/seed/book4/300/420',
        condition: '七成新，略有泛黄',
        ownerId: allUsers[2].id,
        createdAt: dayjs().subtract(4, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '小王子',
        author: '圣埃克苏佩里',
        isbn: '9787020042494',
        coverUrl: 'https://picsum.photos/seed/book5/300/420',
        condition: '九成新，精装版',
        ownerId: allUsers[1].id,
        createdAt: dayjs().subtract(5, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '1984',
        author: '乔治·奥威尔',
        isbn: '9787540426125',
        coverUrl: 'https://picsum.photos/seed/book6/300/420',
        condition: '八成新',
        ownerId: allUsers[2].id,
        createdAt: dayjs().subtract(6, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '平凡的世界',
        author: '路遥',
        isbn: '9787530212004',
        coverUrl: 'https://picsum.photos/seed/book7/300/420',
        condition: '九成新，三册全套',
        ownerId: allUsers[1].id,
        createdAt: dayjs().subtract(7, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '红楼梦',
        author: '曹雪芹',
        isbn: '9787020002207',
        coverUrl: 'https://picsum.photos/seed/book8/300/420',
        condition: '精装典藏版，全新',
        ownerId: allUsers[2].id,
        createdAt: dayjs().subtract(8, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '人类简史',
        author: '尤瓦尔·赫拉利',
        isbn: '9787508647357',
        coverUrl: 'https://picsum.photos/seed/book9/300/420',
        condition: '八成新，略有批注',
        ownerId: allUsers[1].id,
        createdAt: dayjs().subtract(9, 'day').toISOString(),
      },
      {
        id: uuidv4(),
        title: '挪威的森林',
        author: '村上春树',
        isbn: '9787532732968',
        coverUrl: 'https://picsum.photos/seed/book10/300/420',
        condition: '九成新',
        ownerId: allUsers[2].id,
        createdAt: dayjs().subtract(10, 'day').toISOString(),
      },
    ];
    writeJSON('books.json', sampleBooks);

    const exchangesPath = path.join(dataDir, 'exchanges.json');
    writeJSON('exchanges.json', { requests: [], records: [] });
  }
}

initData();

console.log('挂载路由: /api/users');
app.use('/api/users', usersRouter);
console.log('挂载路由: /api/books');
app.use('/api/books', booksRouter);
console.log('挂载路由: /api/exchanges');
app.use('/api/exchanges', exchangesRouter);

app.get('/api/test', (_req, res) => {
  res.json({ status: 'ok', message: 'API 服务正常运行' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`测试地址: http://localhost:${PORT}/api/test`);
  console.log(`图书API: http://localhost:${PORT}/api/books`);
});
