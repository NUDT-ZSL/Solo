import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');

const sqliteDb = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

sqliteDb.serialize();

export function all(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function get(sql: string, params: any[] = []): Promise<any | undefined> {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function run(sql: string, params: any[] = []): Promise<{ lastID: number | bigint; changes: number }> {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export async function initDb(): Promise<void> {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    reputation REAL DEFAULT 5.0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    tags TEXT NOT NULL,
    condition TEXT NOT NULL,
    image_url TEXT,
    gradient_colors TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS exchanges (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    from_book_id TEXT NOT NULL,
    to_book_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id),
    FOREIGN KEY (from_book_id) REFERENCES books(id),
    FOREIGN KEY (to_book_id) REFERENCES books(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    related_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  const row = await get('SELECT COUNT(*) as count FROM users');
  if (!row || row.count === 0) {
    await seedData();
  }
}

async function seedData(): Promise<void> {
  const users = [
    { id: uuidv4(), username: '张三', email: 'zhangsan@example.com', password: '123456', latitude: 31.2304, longitude: 121.4737 },
    { id: uuidv4(), username: '李四', email: 'lisi@example.com', password: '123456', latitude: 31.2350, longitude: 121.4800 },
    { id: uuidv4(), username: '王五', email: 'wangwu@example.com', password: '123456', latitude: 31.2400, longitude: 121.4900 }
  ];

  for (const user of users) {
    const passwordHash = bcrypt.hashSync(user.password, 10);
    await run(
      'INSERT INTO users (id, username, email, password_hash, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, user.username, user.email, passwordHash, user.latitude, user.longitude]
    );
  }

  const books = [
    { id: uuidv4(), owner_id: users[0].id, title: '三体', author: '刘慈欣', tags: ['科幻', '文学'], condition: '九成新', gradient_colors: ['#667eea', '#764ba2'] },
    { id: uuidv4(), owner_id: users[0].id, title: '人类简史', author: '尤瓦尔·赫拉利', tags: ['历史', '哲学'], condition: '八成新', gradient_colors: ['#f093fb', '#f5576c'] },
    { id: uuidv4(), owner_id: users[0].id, title: 'JavaScript高级程序设计', author: 'Nicholas C. Zakas', tags: ['编程', '科技'], condition: '九成新', gradient_colors: ['#4facfe', '#00f2fe'] },
    { id: uuidv4(), owner_id: users[1].id, title: '活着', author: '余华', tags: ['文学', '历史'], condition: '八成新', gradient_colors: ['#fa709a', '#fee140'] },
    { id: uuidv4(), owner_id: users[1].id, title: '白夜行', author: '东野圭吾', tags: ['悬疑', '文学'], condition: '九成新', gradient_colors: ['#a8edea', '#fed6e3'] },
    { id: uuidv4(), owner_id: users[1].id, title: '经济学原理', author: '曼昆', tags: ['经济', '商业'], condition: '七成新', gradient_colors: ['#ffecd2', '#fcb69f'] },
    { id: uuidv4(), owner_id: users[2].id, title: '设计心理学', author: '唐纳德·诺曼', tags: ['设计', '心理'], condition: '八成新', gradient_colors: ['#a1c4fd', '#c2e9fb'] },
    { id: uuidv4(), owner_id: users[2].id, title: '小王子', author: '圣埃克苏佩里', tags: ['儿童', '文学', '诗歌'], condition: '全新', gradient_colors: ['#ff9a9e', '#fecfef'] },
    { id: uuidv4(), owner_id: users[2].id, title: '旅行的艺术', author: '阿兰·德波顿', tags: ['旅行', '艺术', '哲学'], condition: '九成新', gradient_colors: ['#84fab0', '#8fd3f4'] },
    { id: uuidv4(), owner_id: users[1].id, title: '苏东坡传', author: '林语堂', tags: ['传记', '历史', '文学'], condition: '八成新', gradient_colors: ['#d299c2', '#fef9d7'] }
  ];

  for (const book of books) {
    await run(
      'INSERT INTO books (id, owner_id, title, author, tags, condition, gradient_colors) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [book.id, book.owner_id, book.title, book.author, JSON.stringify(book.tags), book.condition, JSON.stringify(book.gradient_colors)]
    );
  }

  console.log('Seed data inserted successfully');
}
