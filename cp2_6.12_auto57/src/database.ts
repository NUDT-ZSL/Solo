import initSqlJs, { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import type { Book, User, Loan, Reservation } from './types';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      require.resolve(`sql.js/dist/${file}`),
  });

  db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'reader',
      token TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      isbn TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      coverUrl TEXT DEFAULT '',
      totalCopies INTEGER NOT NULL DEFAULT 1,
      availableCopies INTEGER NOT NULL DEFAULT 1,
      borrowCount INTEGER NOT NULL DEFAULT 0,
      description TEXT DEFAULT ''
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      bookId TEXT NOT NULL,
      borrowDate TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      returnDate TEXT,
      overdue INTEGER NOT NULL DEFAULT 0,
      fine REAL NOT NULL DEFAULT 0,
      lost INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (bookId) REFERENCES books(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      bookId TEXT NOT NULL,
      position INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (bookId) REFERENCES books(id)
    )
  `);

  seedData(db);

  return db;
}

function seedData(database: Database) {
  const userCount = database.exec('SELECT COUNT(*) as count FROM users')[0].values[0][0] as number;

  if (userCount === 0) {
    const readerId = uuidv4();
    const adminId = uuidv4();

    database.run(
      `INSERT INTO users (id, username, password, role, token) VALUES (?, ?, ?, ?, ?)`,
      [readerId, 'reader', 'reader123', 'reader', uuidv4()]
    );
    database.run(
      `INSERT INTO users (id, username, password, role, token) VALUES (?, ?, ?, ?, ?)`,
      [adminId, 'admin', 'admin123', 'admin', uuidv4()]
    );
  }

  const bookCount = database.exec('SELECT COUNT(*) as count FROM books')[0].values[0][0] as number;

  if (bookCount === 0) {
    const sampleBooks: Omit<Book, 'id' | 'borrowCount'>[] = [
      {
        isbn: '9787020002207',
        title: '红楼梦',
        author: '曹雪芹',
        category: '古典文学',
        coverUrl: 'https://picsum.photos/seed/book1/200/280',
        totalCopies: 3,
        availableCopies: 3,
        description: '中国古典四大名著之首，以贾宝玉、林黛玉、薛宝钗的爱情婚姻悲剧为主线。',
      },
      {
        isbn: '9787020002214',
        title: '西游记',
        author: '吴承恩',
        category: '古典文学',
        coverUrl: 'https://picsum.photos/seed/book2/200/280',
        totalCopies: 2,
        availableCopies: 2,
        description: '明代神魔小说的巅峰之作，讲述唐僧师徒四人西天取经的故事。',
      },
      {
        isbn: '9787020002221',
        title: '三国演义',
        author: '罗贯中',
        category: '古典文学',
        coverUrl: 'https://picsum.photos/seed/book3/200/280',
        totalCopies: 4,
        availableCopies: 4,
        description: '中国第一部长篇章回体历史演义小说，描写东汉末年到西晋初年的历史风云。',
      },
      {
        isbn: '9787544270878',
        title: '活着',
        author: '余华',
        category: '现代文学',
        coverUrl: 'https://picsum.photos/seed/book4/200/280',
        totalCopies: 5,
        availableCopies: 5,
        description: '讲述了农村人福贵悲惨的人生遭遇，展现了生命的韧性。',
      },
      {
        isbn: '9787544253994',
        title: '百年孤独',
        author: '加西亚·马尔克斯',
        category: '外国文学',
        coverUrl: 'https://picsum.photos/seed/book5/200/280',
        totalCopies: 3,
        availableCopies: 3,
        description: '魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事。',
      },
      {
        isbn: '9787115279460',
        title: 'JavaScript高级程序设计',
        author: 'Nicholas C. Zakas',
        category: '计算机',
        coverUrl: 'https://picsum.photos/seed/book6/200/280',
        totalCopies: 4,
        availableCopies: 4,
        description: 'JavaScript技术经典著作，全面深入地介绍了JavaScript语言核心和DOM、BOM等浏览器API。',
      },
      {
        isbn: '9787111407010',
        title: '深入理解计算机系统',
        author: 'Randal E. Bryant',
        category: '计算机',
        coverUrl: 'https://picsum.photos/seed/book7/200/280',
        totalCopies: 2,
        availableCopies: 2,
        description: '从程序员的视角详细阐述计算机系统的本质概念，被读者亲切地称为"CSAPP"。',
      },
      {
        isbn: '9787508647357',
        title: '人类简史',
        author: '尤瓦尔·赫拉利',
        category: '历史',
        coverUrl: 'https://picsum.photos/seed/book8/200/280',
        totalCopies: 6,
        availableCopies: 6,
        description: '从十万年前有生命迹象开始到21世纪资本、科技交织的人类发展史。',
      },
      {
        isbn: '9787550237933',
        title: '三体',
        author: '刘慈欣',
        category: '科幻',
        coverUrl: 'https://picsum.photos/seed/book9/200/280',
        totalCopies: 5,
        availableCopies: 5,
        description: '中国科幻里程碑之作，讲述了地球人类文明和三体文明的信息交流、生死搏杀。',
      },
      {
        isbn: '9787532755110',
        title: '小王子',
        author: '圣埃克苏佩里',
        category: '童话',
        coverUrl: 'https://picsum.photos/seed/book10/200/280',
        totalCopies: 8,
        availableCopies: 8,
        description: '一本写给所有人的童话，引导读者去发掘深藏于内心的童心与童真。',
      },
      {
        isbn: '9787544280907',
        title: '白夜行',
        author: '东野圭吾',
        category: '推理',
        coverUrl: 'https://picsum.photos/seed/book11/200/280',
        totalCopies: 4,
        availableCopies: 4,
        description: '东野圭吾推理小说代表作，讲述了一段跨越十九年的悲情故事。',
      },
      {
        isbn: '9787513324212',
        title: '原则',
        author: '瑞·达利欧',
        category: '管理',
        coverUrl: 'https://picsum.photos/seed/book12/200/280',
        totalCopies: 3,
        availableCopies: 3,
        description: '桥水基金创始人瑞·达利欧的一生智慧精髓，分享他的生活和工作原则。',
      },
    ];

    for (const book of sampleBooks) {
      const id = uuidv4();
      database.run(
        `INSERT INTO books (id, isbn, title, author, category, coverUrl, totalCopies, availableCopies, borrowCount, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [id, book.isbn, book.title, book.author, book.category, book.coverUrl, book.totalCopies, book.totalCopies, book.description]
      );
    }
  }
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function rowToBook(row: any[]): Book {
  return {
    id: row[0] as string,
    isbn: row[1] as string,
    title: row[2] as string,
    author: row[3] as string,
    category: row[4] as string,
    coverUrl: row[5] as string,
    totalCopies: row[6] as number,
    availableCopies: row[7] as number,
    borrowCount: row[8] as number,
    description: row[9] as string,
  };
}

export function rowToUser(row: any[]): User {
  return {
    id: row[0] as string,
    username: row[1] as string,
    password: row[2] as string,
    role: row[3] as 'reader' | 'admin',
    token: row[4] as string | null,
  };
}

export function rowToLoan(row: any[]): Loan {
  return {
    id: row[0] as string,
    userId: row[1] as string,
    bookId: row[2] as string,
    borrowDate: row[3] as string,
    dueDate: row[4] as string,
    returnDate: row[5] as string | null,
    overdue: !!row[6],
    fine: row[7] as number,
    lost: !!row[8],
    userName: row[9] as string | undefined,
    bookTitle: row[10] as string | undefined,
  };
}

export function rowToReservation(row: any[]): Reservation {
  return {
    id: row[0] as string,
    userId: row[1] as string,
    bookId: row[2] as string,
    position: row[3] as number,
    status: row[4] as 'active' | 'fulfilled' | 'cancelled',
    createdAt: row[5] as string,
    bookTitle: row[6] as string | undefined,
  };
}
