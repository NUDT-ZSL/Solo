import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(ROOT_DIR, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

const dbPath = path.join(ROOT_DIR, 'data.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    phone TEXT,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS furniture (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    size TEXT NOT NULL,
    years INTEGER NOT NULL,
    city TEXT NOT NULL,
    timeRange TEXT NOT NULL,
    images_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'idle',
    userId TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exchange_requests (
    id TEXT PRIMARY KEY,
    furnitureId TEXT NOT NULL,
    furnitureName TEXT NOT NULL,
    fromUserId TEXT NOT NULL,
    fromUserName TEXT NOT NULL,
    fromUserAvatar TEXT,
    toUserId TEXT NOT NULL,
    toUserName TEXT NOT NULL,
    contact TEXT,
    email TEXT,
    phone TEXT,
    expectedTime TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    "read" INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY(furnitureId) REFERENCES furniture(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    furnitureId TEXT NOT NULL,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    avatar TEXT,
    rating INTEGER NOT NULL,
    content TEXT,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY(furnitureId) REFERENCES furniture(id)
  );

  CREATE INDEX IF NOT EXISTS idx_furniture_category ON furniture(category);
  CREATE INDEX IF NOT EXISTS idx_furniture_status ON furniture(status);
  CREATE INDEX IF NOT EXISTS idx_furniture_city ON furniture(city);
  CREATE INDEX IF NOT EXISTS idx_requests_to ON exchange_requests(toUserId);
  CREATE INDEX IF NOT EXISTS idx_requests_from ON exchange_requests(fromUserId);
  CREATE INDEX IF NOT EXISTS idx_reviews_furniture ON reviews(furnitureId);
`);

{
  const columns = db
    .prepare("PRAGMA table_info(exchange_requests)")
    .all() as { name: string }[];
  const hasReadColumn = columns.some((col) => col.name === "read");
  if (!hasReadColumn) {
    db.exec(
      'ALTER TABLE exchange_requests ADD COLUMN "read" INTEGER NOT NULL DEFAULT 0'
    );
  }
}

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare(
    'INSERT INTO users (id, name, avatar, phone, email) VALUES (?, ?, ?, ?, ?)'
  );

  insertUser.run(
    'user_1',
    '小明',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
    '13800138001',
    'xiaoming@example.com'
  );

  insertUser.run(
    'user_2',
    '小红',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    '13800138002',
    'xiaohong@example.com'
  );

  const now = Date.now();
  const insertFurniture = db.prepare(
    `INSERT INTO furniture (id, name, category, size, years, city, timeRange, images_json, status, userId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const furnitureData = [
    {
      id: 'fur_1',
      name: '北欧简约三人沙发',
      category: 'sofa',
      size: '220×90×85cm',
      years: 2,
      city: '北京',
      timeRange: '周末全天',
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&h=600&fit=crop'
      ],
      status: 'idle',
      userId: 'user_1'
    },
    {
      id: 'fur_2',
      name: '实木餐桌带4椅',
      category: 'table',
      size: '140×80×75cm',
      years: 3,
      city: '上海',
      timeRange: '工作日晚7点后',
      images: [
        'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1503602642458-232111445657?w=800&h=600&fit=crop'
      ],
      status: 'reserved',
      userId: 'user_1'
    },
    {
      id: 'fur_3',
      name: '人体工学办公椅',
      category: 'chair',
      size: '68×68×120cm',
      years: 1,
      city: '广州',
      timeRange: '随时可约',
      images: [
        'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&h=600&fit=crop'
      ],
      status: 'idle',
      userId: 'user_2'
    },
    {
      id: 'fur_4',
      name: '大容量衣柜收纳柜',
      category: 'cabinet',
      size: '180×60×200cm',
      years: 4,
      city: '深圳',
      timeRange: '周末上午',
      images: [
        'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=800&h=600&fit=crop'
      ],
      status: 'exchanged',
      userId: 'user_1'
    },
    {
      id: 'fur_5',
      name: '1.8米布艺双人床',
      category: 'bed',
      size: '180×200cm',
      years: 2,
      city: '北京',
      timeRange: '周日全天',
      images: [
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop'
      ],
      status: 'idle',
      userId: 'user_2'
    },
    {
      id: 'fur_6',
      name: '轻奢单人休闲沙发',
      category: 'sofa',
      size: '90×85×85cm',
      years: 1,
      city: '杭州',
      timeRange: '随时可约',
      images: [
        'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&h=600&fit=crop'
      ],
      status: 'idle',
      userId: 'user_2'
    },
    {
      id: 'fur_7',
      name: '圆形玻璃茶几',
      category: 'table',
      size: 'φ80×45cm',
      years: 2,
      city: '上海',
      timeRange: '工作日晚8点后',
      images: [
        'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&h=600&fit=crop'
      ],
      status: 'idle',
      userId: 'user_1'
    },
    {
      id: 'fur_8',
      name: '北欧实木餐椅(2把)',
      category: 'chair',
      size: '45×45×90cm',
      years: 3,
      city: '南京',
      timeRange: '周六下午',
      images: [
        'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&h=600&fit=crop'
      ],
      status: 'reserved',
      userId: 'user_2'
    },
    {
      id: 'fur_9',
      name: '厨房餐边柜储物柜',
      category: 'cabinet',
      size: '120×40×90cm',
      years: 1,
      city: '成都',
      timeRange: '周末全天',
      images: [
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&h=600&fit=crop'
      ],
      status: 'idle',
      userId: 'user_1'
    },
    {
      id: 'fur_10',
      name: '1.5米单人床架',
      category: 'bed',
      size: '150×200cm',
      years: 5,
      city: '武汉',
      timeRange: '随时可约',
      images: [
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=600&fit=crop'
      ],
      status: 'idle',
      userId: 'user_2'
    }
  ];

  for (const f of furnitureData) {
    insertFurniture.run(
      f.id,
      f.name,
      f.category,
      f.size,
      f.years,
      f.city,
      f.timeRange,
      JSON.stringify(f.images),
      f.status,
      f.userId,
      now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
    );
  }

  const insertReview = db.prepare(
    `INSERT INTO reviews (id, furnitureId, userId, userName, avatar, rating, content, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const reviewsData = [
    {
      id: 'rev_1',
      furnitureId: 'fur_1',
      userId: 'user_2',
      userName: '小红',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
      rating: 5,
      content: '沙发非常新，和描述一致，主人也很nice！交换过程很顺利。',
      createdAt: now - 5 * 24 * 60 * 60 * 1000
    },
    {
      id: 'rev_2',
      furnitureId: 'fur_2',
      userId: 'user_2',
      userName: '小红',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
      rating: 4,
      content: '餐桌质量不错，椅子稍微有点小瑕疵，整体满意。',
      createdAt: now - 3 * 24 * 60 * 60 * 1000
    },
    {
      id: 'rev_3',
      furnitureId: 'fur_3',
      userId: 'user_1',
      userName: '小明',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
      rating: 5,
      content: '办公椅很舒服，久坐不累，推荐！',
      createdAt: now - 7 * 24 * 60 * 60 * 1000
    },
    {
      id: 'rev_4',
      furnitureId: 'fur_5',
      userId: 'user_1',
      userName: '小明',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
      rating: 4,
      content: '床架很稳，安装简单，就是稍微有点重。',
      createdAt: now - 2 * 24 * 60 * 60 * 1000
    }
  ];

  for (const r of reviewsData) {
    insertReview.run(
      r.id,
      r.furnitureId,
      r.userId,
      r.userName,
      r.avatar,
      r.rating,
      r.content,
      r.createdAt
    );
  }

  const insertRequest = db.prepare(
    `INSERT INTO exchange_requests (id, furnitureId, furnitureName, fromUserId, fromUserName, fromUserAvatar,
       toUserId, toUserName, contact, email, phone, expectedTime, status, "read", createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  );

  const requestsData = [
    {
      id: 'req_1',
      furnitureId: 'fur_6',
      furnitureName: '轻奢单人休闲沙发',
      fromUserId: 'user_1',
      fromUserName: '小明',
      fromUserAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
      toUserId: 'user_2',
      toUserName: '小红',
      contact: '微信：xiaoming_wx',
      email: 'xiaoming@example.com',
      phone: '13800138001',
      expectedTime: '本周日下午',
      status: 'pending',
      createdAt: now - 1 * 24 * 60 * 60 * 1000
    },
    {
      id: 'req_2',
      furnitureId: 'fur_7',
      furnitureName: '圆形玻璃茶几',
      fromUserId: 'user_2',
      fromUserName: '小红',
      fromUserAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
      toUserId: 'user_1',
      toUserName: '小明',
      contact: '微信：xiaohong_wx',
      email: 'xiaohong@example.com',
      phone: '13800138002',
      expectedTime: '下周三晚',
      status: 'pending',
      createdAt: now - 6 * 60 * 60 * 1000
    },
    {
      id: 'req_3',
      furnitureId: 'fur_9',
      furnitureName: '厨房餐边柜储物柜',
      fromUserId: 'user_2',
      fromUserName: '小红',
      fromUserAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
      toUserId: 'user_1',
      toUserName: '小明',
      contact: '微信：xiaohong_wx',
      email: 'xiaohong@example.com',
      phone: '13800138002',
      expectedTime: '周六上午',
      status: 'pending',
      createdAt: now - 2 * 60 * 60 * 1000
    }
  ];

  for (const r of requestsData) {
    insertRequest.run(
      r.id,
      r.furnitureId,
      r.furnitureName,
      r.fromUserId,
      r.fromUserName,
      r.fromUserAvatar,
      r.toUserId,
      r.toUserName,
      r.contact,
      r.email,
      r.phone,
      r.expectedTime,
      r.status,
      r.createdAt
    );
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext) && allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 jpg/png 格式图片'));
    }
  }
});

function formatFurniture(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    size: row.size,
    years: row.years,
    city: row.city,
    timeRange: row.timeRange,
    images: JSON.parse(row.images_json),
    status: row.status,
    userId: row.userId,
    createdAt: row.createdAt
  };
}

app.get('/api/furniture', (req, res) => {
  const { category, keyword, userId } = req.query as {
    category?: string;
    keyword?: string;
    userId?: string;
  };

  let sql = 'SELECT * FROM furniture WHERE 1=1';
  const params: any[] = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (userId) {
    sql += ' AND userId = ?';
    params.push(userId);
  }

  if (keyword) {
    sql += ' AND (name LIKE ? OR city LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY createdAt DESC';

  const rows = db.prepare(sql).all(...params) as any[];
  const furniture = rows.map(formatFurniture);
  res.json(furniture);
});

app.get('/api/furniture/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM furniture WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: '家具不存在' });
  }
  res.json(formatFurniture(row));
});

app.get('/api/furniture/:id/reviews', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM reviews WHERE furnitureId = ? ORDER BY createdAt DESC')
    .all(req.params.id) as any[];
  res.json(rows);
});

app.post('/api/furniture', (req, res) => {
  const { name, category, size, years, city, timeRange, images, userId } = req.body;

  if (!name || !category || !size || years === undefined || !city || !timeRange || !userId) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const id = `fur_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const createdAt = Date.now();
  const imagesJson = JSON.stringify(images || []);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(400).json({ error: '用户不存在' });
  }

  db.prepare(
    `INSERT INTO furniture (id, name, category, size, years, city, timeRange, images_json, status, userId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'idle', ?, ?)`
  ).run(id, name, category, size, years, city, timeRange, imagesJson, userId, createdAt);

  const row = db.prepare('SELECT * FROM furniture WHERE id = ?').get(id) as any;
  res.status(201).json(formatFurniture(row));
});

app.patch('/api/furniture/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['idle', 'reserved', 'exchanged'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: '无效的状态值，必须是 idle/reserved/exchanged' });
  }

  const existing = db.prepare('SELECT * FROM furniture WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    return res.status(404).json({ error: '家具不存在' });
  }

  db.prepare('UPDATE furniture SET status = ? WHERE id = ?').run(status, req.params.id);
  const row = db.prepare('SELECT * FROM furniture WHERE id = ?').get(req.params.id) as any;
  res.json(formatFurniture(row));
});

app.post('/api/upload', (req, res) => {
  const singleUpload = upload.single('file');
  singleUpload(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    if (!req.file) {
      return res.status(400).json({ error: '未选择文件' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });
});

app.get('/api/exchange-requests', (req, res) => {
  const { userId } = req.query as { userId?: string };

  if (!userId) {
    return res.status(400).json({ error: 'userId 参数必填' });
  }

  const received = db
    .prepare('SELECT * FROM exchange_requests WHERE toUserId = ? ORDER BY createdAt DESC')
    .all(userId) as any[];
  const sent = db
    .prepare('SELECT * FROM exchange_requests WHERE fromUserId = ? ORDER BY createdAt DESC')
    .all(userId) as any[];

  res.json({ received, sent });
});

app.post('/api/exchange-requests', (req, res) => {
  const { furnitureId, fromUserId, contact, email, phone, expectedTime } = req.body;

  if (!furnitureId || !fromUserId) {
    return res.status(400).json({ error: 'furnitureId 和 fromUserId 必填' });
  }

  const furniture = db.prepare('SELECT * FROM furniture WHERE id = ?').get(furnitureId) as any;
  if (!furniture) {
    return res.status(404).json({ error: '家具不存在' });
  }

  if (furniture.userId === fromUserId) {
    return res.status(400).json({ error: '不能向自己的家具发起交换请求' });
  }

  const fromUser = db.prepare('SELECT * FROM users WHERE id = ?').get(fromUserId) as any;
  const toUser = db.prepare('SELECT * FROM users WHERE id = ?').get(furniture.userId) as any;

  if (!fromUser || !toUser) {
    return res.status(400).json({ error: '用户不存在' });
  }

  const id = `req_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const createdAt = Date.now();

  db.prepare(
    `INSERT INTO exchange_requests (id, furnitureId, furnitureName, fromUserId, fromUserName, fromUserAvatar,
       toUserId, toUserName, contact, email, phone, expectedTime, status, "read", createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`
  ).run(
    id,
    furnitureId,
    furniture.name,
    fromUserId,
    fromUser.name,
    fromUser.avatar,
    toUser.id,
    toUser.name,
    contact || null,
    email || null,
    phone || null,
    expectedTime || null,
    createdAt
  );

  const row = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(id) as any;
  res.status(201).json(row);
});

function handleExchangeRequestStatus(id: string, status: string) {
  const validStatuses = ['accepted', 'rejected'];

  if (!status || !validStatuses.includes(status)) {
    return { error: '无效的状态值，必须是 accepted/rejected', statusCode: 400 };
  }

  const existing = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(id) as any;
  if (!existing) {
    return { error: '交换请求不存在', statusCode: 404 };
  }

  db.prepare('UPDATE exchange_requests SET status = ? WHERE id = ?').run(status, id);

  if (status === 'accepted') {
    db.prepare('UPDATE furniture SET status = ? WHERE id = ?').run('reserved', existing.furnitureId);
  }

  const row = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(id) as any;
  const result: any = { ...row };

  if (status === 'accepted') {
    const fromUser = db.prepare('SELECT phone, email FROM users WHERE id = ?').get(row.fromUserId) as any;
    const toUser = db.prepare('SELECT phone, email FROM users WHERE id = ?').get(row.toUserId) as any;
    result.fromUserContact = { phone: fromUser?.phone, email: fromUser?.email };
    result.toUserContact = { phone: toUser?.phone, email: toUser?.email };
  }

  return { data: result, statusCode: 200 };
}

app.patch('/api/exchange-requests/:id', (req, res) => {
  const { status } = req.body;
  const result = handleExchangeRequestStatus(req.params.id, status);
  if (result.error) {
    return res.status(result.statusCode!).json({ error: result.error });
  }
  res.json(result.data);
});

app.patch('/api/exchange-requests/:id/status', (req, res) => {
  const { status } = req.body;
  const result = handleExchangeRequestStatus(req.params.id, status);
  if (result.error) {
    return res.status(result.statusCode!).json({ error: result.error });
  }
  res.json(result.data);
});

app.patch('/api/exchange-requests/:id/read', (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: '交换请求不存在' });
  }

  db.prepare('UPDATE exchange_requests SET "read" = 1 WHERE id = ?').run(id);
  const row = db.prepare('SELECT * FROM exchange_requests WHERE id = ?').get(id) as any;
  res.json(row);
});

app.patch('/api/exchange-requests/read-all', (req, res) => {
  const { userId } = req.query as { userId?: string };

  if (!userId) {
    return res.status(400).json({ error: 'userId 参数必填' });
  }

  const info = db
    .prepare('UPDATE exchange_requests SET "read" = 1 WHERE toUserId = ? AND status = \'pending\'')
    .run(userId);

  const rows = db
    .prepare("SELECT * FROM exchange_requests WHERE toUserId = ? AND status = 'pending' ORDER BY createdAt DESC")
    .all(userId) as any[];

  res.json({ updatedCount: info.changes, requests: rows });
});

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Database: ${dbPath}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});
