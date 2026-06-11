import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

let db: Database | null = null;
const dbPath = path.join(__dirname, '..', 'bookexchange.db');

export const initDatabase = async () => {
  const SQL = await initSqlJs();

  let existingData: Uint8Array | null = null;
  if (fs.existsSync(dbPath)) {
    existingData = fs.readFileSync(dbPath);
  }

  db = existingData ? new SQL.Database(existingData) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
      coverUrl TEXT,
      description TEXT,
      userId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exchanges (
      id TEXT PRIMARY KEY,
      fromUserId TEXT NOT NULL,
      toUserId TEXT NOT NULL,
      bookId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL
    );
  `);

  const bookCount = (db.exec('SELECT COUNT(*) as count FROM books')[0]?.values[0][0] as number) || 0;
  if (bookCount === 0) {
    seedSampleData();
  }

  saveDatabase();
  console.log('Database initialized successfully');
};

const saveDatabase = () => {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

const seedSampleData = () => {
  if (!db) return;

  const sampleBooks = [
    { title: '三体', author: '刘慈欣', isbn: '9787536692930', coverUrl: 'https://img3.doubanio.com/view/subject/l/public/s2996698.jpg', description: '中国科幻文学的里程碑之作', userId: 'user-1' },
    { title: '活着', author: '余华', isbn: '9787506365437', coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29609757.jpg', description: '讲述了农村人福贵悲惨的人生遭遇', userId: 'user-1' },
    { title: '百年孤独', author: '加西亚·马尔克斯', isbn: '9787544253994', coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29236915.jpg', description: '魔幻现实主义文学的代表作', userId: 'user-2' },
    { title: '围城', author: '钱钟书', isbn: '9787020024759', coverUrl: 'https://img2.doubanio.com/view/subject/l/public/s1074473.jpg', description: '现代文学的经典之作', userId: 'user-2' },
    { title: '平凡的世界', author: '路遥', isbn: '9787530212004', coverUrl: 'https://img2.doubanio.com/view/subject/l/public/s29021863.jpg', description: '一部全景式地表现中国当代城乡社会生活的长篇小说', userId: 'user-3' },
    { title: '红楼梦', author: '曹雪芹', isbn: '9787020002207', coverUrl: 'https://img2.doubanio.com/view/subject/l/public/s1071890.jpg', description: '中国古典四大名著之首', userId: 'user-3' },
    { title: '1984', author: '乔治·奥威尔', isbn: '9787540415457', coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s28989605.jpg', description: '反乌托邦文学的经典代表作', userId: 'user-1' },
    { title: '人类简史', author: '尤瓦尔·赫拉利', isbn: '9787508647357', coverUrl: 'https://img2.doubanio.com/view/subject/l/public/s27840371.jpg', description: '从认知革命到科学革命的人类发展历程', userId: 'user-2' },
    { title: '小王子', author: '圣埃克苏佩里', isbn: '9787020042494', coverUrl: 'https://img2.doubanio.com/view/subject/l/public/s1102673.jpg', description: '写给成年人的童话', userId: 'user-3' },
    { title: '白夜行', author: '东野圭吾', isbn: '9787544258609', coverUrl: 'https://img2.doubanio.com/view/subject/l/public/s4329992.jpg', description: '日本推理小说的经典之作', userId: 'user-1' },
    { title: '嫌疑人X的献身', author: '东野圭吾', isbn: '9787544267618', coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s26847472.jpg', description: '一个天才数学家的完美犯罪', userId: 'user-2' },
    { title: '解忧杂货店', author: '东野圭吾', isbn: '9787544270878', coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s28743421.jpg', description: '一个关于命运与救赎的温暖故事', userId: 'user-3' },
  ];

  const now = Date.now();
  const stmt = db.prepare(
    'INSERT INTO books (id, title, author, isbn, coverUrl, description, userId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  sampleBooks.forEach((book, index) => {
    stmt.run([
      uuidv4(),
      book.title,
      book.author,
      book.isbn,
      book.coverUrl,
      book.description,
      book.userId,
      'available',
      new Date(now - index * 86400000).toISOString(),
    ]);
  });

  stmt.free();
  saveDatabase();
  console.log('Sample data seeded successfully');
};

export const query = <T = any>(sql: string, params: any[] = []): T[] => {
  if (!db) throw new Error('Database not initialized');
  const results = db.exec(sql, params);
  if (results.length === 0) return [];

  const columns = results[0].columns;
  const values = results[0].values;

  return values.map((row: any[]) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
};

export const getOne = <T = any>(sql: string, params: any[] = []): T | null => {
  const results = query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
};

export const run = (sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } => {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.run(params);
  const changes = db.getRowsModified();
  stmt.free();
  saveDatabase();
  return { changes, lastInsertRowid: 0 };
};

export const runTransaction = (callback: () => void) => {
  if (!db) throw new Error('Database not initialized');
  db.run('BEGIN TRANSACTION');
  try {
    callback();
    db.run('COMMIT');
    saveDatabase();
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
};

export default { initDatabase, query, getOne, run, runTransaction };
