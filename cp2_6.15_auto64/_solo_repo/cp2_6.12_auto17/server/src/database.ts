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

  const cover = (seed: number) => `https://picsum.photos/seed/book${seed}/300/420`;

  const sampleBooks = [
    { title: '三体', author: '刘慈欣', isbn: '9787536692930', coverUrl: cover(1), description: '中国科幻文学的里程碑之作', userId: 'user-1' },
    { title: '活着', author: '余华', isbn: '9787506365437', coverUrl: cover(2), description: '讲述了农村人福贵悲惨的人生遭遇', userId: 'user-1' },
    { title: '百年孤独', author: '加西亚·马尔克斯', isbn: '9787544253994', coverUrl: cover(3), description: '魔幻现实主义文学的代表作', userId: 'user-2' },
    { title: '围城', author: '钱钟书', isbn: '9787020024759', coverUrl: cover(4), description: '现代文学的经典之作', userId: 'user-2' },
    { title: '平凡的世界', author: '路遥', isbn: '9787530212004', coverUrl: cover(5), description: '一部全景式地表现中国当代城乡社会生活的长篇小说', userId: 'user-3' },
    { title: '红楼梦', author: '曹雪芹', isbn: '9787020002207', coverUrl: cover(6), description: '中国古典四大名著之首', userId: 'user-3' },
    { title: '1984', author: '乔治·奥威尔', isbn: '9787540415457', coverUrl: cover(7), description: '反乌托邦文学的经典代表作', userId: 'user-1' },
    { title: '人类简史', author: '尤瓦尔·赫拉利', isbn: '9787508647357', coverUrl: cover(8), description: '从认知革命到科学革命的人类发展历程', userId: 'user-2' },
    { title: '小王子', author: '圣埃克苏佩里', isbn: '9787020042494', coverUrl: cover(9), description: '写给成年人的童话', userId: 'user-3' },
    { title: '白夜行', author: '东野圭吾', isbn: '9787544258609', coverUrl: cover(10), description: '日本推理小说的经典之作', userId: 'user-1' },
    { title: '嫌疑人X的献身', author: '东野圭吾', isbn: '9787544267618', coverUrl: cover(11), description: '一个天才数学家的完美犯罪', userId: 'user-2' },
    { title: '解忧杂货店', author: '东野圭吾', isbn: '9787544270878', coverUrl: cover(12), description: '一个关于命运与救赎的温暖故事', userId: 'user-3' },
    { title: '挪威的森林', author: '村上春树', isbn: '9787544282765', coverUrl: cover(13), description: '青春与爱情的经典之作', userId: 'user-1' },
    { title: '追风筝的人', author: '卡勒德·胡赛尼', isbn: '9787208061644', coverUrl: cover(14), description: '关于友谊、背叛与救赎的感人故事', userId: 'user-2' },
    { title: '月亮与六便士', author: '毛姆', isbn: '9787540484743', coverUrl: cover(15), description: '理想与现实的永恒对话', userId: 'user-3' },
    { title: '刀锋', author: '毛姆', isbn: '9787540469672', coverUrl: cover(16), description: '关于人生意义的追寻之旅', userId: 'user-1' },
    { title: '了不起的盖茨比', author: '菲茨杰拉德', isbn: '9787544725743', coverUrl: cover(17), description: '美国梦的缩影与幻灭', userId: 'user-2' },
    { title: '老人与海', author: '海明威', isbn: '9787544726832', coverUrl: cover(18), description: '人的灵魂的尊严与不屈', userId: 'user-3' },
    { title: '基督山伯爵', author: '大仲马', isbn: '9787020000790', coverUrl: cover(19), description: '关于复仇与宽恕的史诗巨著', userId: 'user-1' },
    { title: '傲慢与偏见', author: '简·奥斯汀', isbn: '9787020002214', coverUrl: cover(20), description: '英国乡村的爱情喜剧', userId: 'user-2' },
    { title: '简爱', author: '夏洛蒂·勃朗特', isbn: '9787020001965', coverUrl: cover(21), description: '女性独立精神的宣言', userId: 'user-3' },
    { title: '呼啸山庄', author: '艾米莉·勃朗特', isbn: '9787020001972', coverUrl: cover(22), description: '荒原上的爱恨情仇', userId: 'user-1' },
    { title: '瓦尔登湖', author: '梭罗', isbn: '9787540450779', coverUrl: cover(23), description: '自然生活的实验与思考', userId: 'user-2' },
    { title: '查拉图斯特拉如是说', author: '尼采', isbn: '9787100078344', coverUrl: cover(24), description: '超人哲学的诗意表达', userId: 'user-3' },
    { title: '存在与时间', author: '海德格尔', isbn: '9787108017864', coverUrl: cover(25), description: '二十世纪存在主义的奠基之作', userId: 'user-1' },
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
