import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'library.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
      category TEXT,
      cover_emoji TEXT DEFAULT '📚',
      description TEXT,
      publisher TEXT,
      publish_date TEXT,
      location TEXT,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'borrowed', 'reserved')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      pickup_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'cancelled', 'completed')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS borrow_records (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reservation_id TEXT,
      borrow_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      fine_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'borrowed' CHECK(status IN ('borrowed', 'returned', 'overdue')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    );

    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number };
  if (bookCount.count === 0) {
    const insertBook = db.prepare(`
      INSERT INTO books (id, title, author, isbn, category, cover_emoji, description, publisher, publish_date, location, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const books = [
      ['b001', '百年孤独', '加西亚·马尔克斯', '9787544253994', '文学', '📖', '魔幻现实主义文学的代表作，讲述布恩迪亚家族七代人的传奇故事。', '南海出版公司', '2011-06-01', 'A区-01-01', 'available'],
      ['b002', '活着', '余华', '9787506365437', '文学', '📕', '讲述农村人福贵悲惨的人生遭遇。', '作家出版社', '2012-08-01', 'A区-01-02', 'available'],
      ['b003', '三体', '刘慈欣', '9787536692930', '科技', '🚀', '中国当代科幻文学的里程碑之作。', '重庆出版社', '2008-01-01', 'B区-02-01', 'borrowed'],
      ['b004', '人类简史', '尤瓦尔·赫拉利', '9787508647357', '历史', '🌍', '从认知革命到科学革命的人类发展历程。', '中信出版社', '2014-11-01', 'C区-03-01', 'available'],
      ['b005', '明朝那些事儿', '当年明月', '9787213046432', '历史', '📜', '用通俗的语言讲述明朝三百年历史。', '浙江人民出版社', '2011-05-01', 'C区-03-02', 'available'],
      ['b006', '深度学习', 'Ian Goodfellow', '9787115461476', '科技', '🤖', '深度学习领域的经典教材。', '人民邮电出版社', '2017-07-01', 'B区-02-02', 'available'],
      ['b007', '红楼梦', '曹雪芹', '9787020002207', '文学', '🏯', '中国古典小说的巅峰之作。', '人民文学出版社', '2008-07-01', 'A区-01-03', 'available'],
      ['b008', '小王子', '圣埃克苏佩里', '9787020042494', '文学', '🌟', '一部写给大人的童话。', '人民文学出版社', '2003-08-01', 'A区-01-04', 'borrowed'],
      ['b009', 'JavaScript高级程序设计', 'Nicholas C. Zakas', '9787115545643', '科技', '💻', '前端开发必备经典书籍。', '人民邮电出版社', '2020-10-01', 'B区-02-03', 'available'],
      ['b010', '万历十五年', '黄仁宇', '9787108009821', '历史', '👑', '大历史观的代表作。', '生活·读书·新知三联书店', '1997-05-01', 'C区-03-03', 'available'],
    ];

    const insertMany = db.transaction(() => {
      for (const book of books) {
        insertBook.run(...book);
      }
    });
    insertMany();

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)
    `);
    insertUser.run('u001', '张三', 'zhangsan@example.com', 'user');
    insertUser.run('u002', '李管理员', 'admin@library.com', 'admin');

    const insertBorrow = db.prepare(`
      INSERT INTO borrow_records (id, book_id, user_id, borrow_date, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);
    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() - 10);
    const overdueDue = new Date(today);
    overdueDue.setDate(overdueDue.getDate() - 5);

    insertBorrow.run('br001', 'b003', 'u001', overdueDate.toISOString().split('T')[0], overdueDue.toISOString().split('T')[0], 'overdue');
    insertBorrow.run('br002', 'b008', 'u001', today.toISOString().split('T')[0], dueDate.toISOString().split('T')[0], 'borrowed');

    const insertSession = db.prepare(`
      INSERT INTO reading_sessions (id, book_id, user_id, start_time, end_time, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const sessions = [
      ['rs001', 'b003', 'u001', getDateTime(-7, 9), getDateTime(-7, 10, 30), 5400],
      ['rs002', 'b003', 'u001', getDateTime(-6, 8), getDateTime(-6, 9, 15), 4500],
      ['rs003', 'b008', 'u001', getDateTime(-5, 19), getDateTime(-5, 20), 3600],
      ['rs004', 'b003', 'u001', getDateTime(-4, 10), getDateTime(-4, 11, 20), 4800],
      ['rs005', 'b008', 'u001', getDateTime(-3, 20), getDateTime(-3, 21, 10), 4200],
      ['rs006', 'b003', 'u001', getDateTime(-2, 9), getDateTime(-2, 10, 15), 4500],
      ['rs007', 'b008', 'u001', getDateTime(-1, 18), getDateTime(-1, 19, 30), 5400],
      ['rs008', 'b003', 'u001', getDateTime(0, 8), getDateTime(0, 9, 45), 6300],
    ];

    for (const session of sessions) {
      insertSession.run(...session);
    }
  }

  console.log('数据库初始化完成');
}

function getDateTime(daysOffset: number, hour: number, minute: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export { db, initDatabase };
export default db;
