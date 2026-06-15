import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  const dbPath = path.join(__dirname, 'bookclub.db');
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      creator_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      chapter TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      reply_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_title TEXT NOT NULL,
      book_author TEXT NOT NULL,
      book_cover TEXT,
      reason TEXT,
      score REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reading_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_title TEXT NOT NULL,
      book_author TEXT NOT NULL,
      douban_url TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, book_title, book_author)
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover TEXT,
      tags TEXT NOT NULL,
      description TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_posts_group_id ON posts(group_id);
    CREATE INDEX IF NOT EXISTS idx_replies_post_id ON replies(post_id);
    CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
    CREATE INDEX IF NOT EXISTS idx_reading_list_user_id ON reading_list(user_id);
  `);

  await seedData(db);
  return db;
}

async function seedData(database: Database) {
  const userCount = await database.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count > 0) return;

  const users = [
    { name: '小明' },
    { name: '小红' },
    { name: '阿华' },
    { name: '李雷' },
    { name: '韩梅梅' }
  ];

  const userIds: number[] = [];
  for (const u of users) {
    const result = await database.run('INSERT INTO users (name) VALUES (?)', u.name);
    if (result.lastID) userIds.push(result.lastID);
  }

  const groups = [
    { name: '科幻迷基地', description: '一起探索科幻世界的无限可能', creatorId: userIds[0] },
    { name: '文学经典共读', description: '深度阅读中外文学经典作品', creatorId: userIds[1] },
    { name: '历史爱好者', description: '研读历史，以史为鉴', creatorId: userIds[2] },
    { name: '哲学思辨社', description: '思考人生的终极问题', creatorId: userIds[3] }
  ];

  const groupIds: number[] = [];
  for (const g of groups) {
    const result = await database.run(
      'INSERT INTO groups (name, description, creator_id) VALUES (?, ?, ?)',
      g.name, g.description, g.creatorId
    );
    if (result.lastID) groupIds.push(result.lastID);
  }

  for (let i = 0; i < groupIds.length; i++) {
    for (let j = 0; j < userIds.length; j++) {
      try {
        await database.run(
          'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
          groupIds[i], userIds[j]
        );
      } catch { /* ignore */ }
    }
  }

  const posts = [
    { groupId: groupIds[0], userId: userIds[0], chapter: '第一章', title: '三体中的黑暗森林法则太震撼了', content: '## 黑暗森林\n\n宇宙就是一座黑暗森林，每个文明都是带枪的猎人...这种设定真的让人细思极恐！#科幻 #三体 #宇宙' },
    { groupId: groupIds[0], userId: userIds[1], chapter: '第三章', title: '你们觉得曲率驱动真的可行吗？', content: '从物理角度分析，曲率驱动飞船是否真的能实现超光速旅行？\n\n我觉得这涉及到时空本身的结构问题。#科幻 #物理 #曲率驱动' },
    { groupId: groupIds[1], userId: userIds[2], chapter: '第一部分', title: '百年孤独的魔幻现实主义手法', content: '马尔克斯用魔幻现实主义把现实和幻想融为一体...布恩迪亚家族的命运让人唏嘘。#文学 #魔幻现实主义 #百年孤独' },
    { groupId: groupIds[1], userId: userIds[3], chapter: '第二章', title: '红楼梦的诗词鉴赏', content: '《葬花吟》真是字字血泪，黛玉的悲剧命运在这首词中展现得淋漓尽致。\n\n"花谢花飞花满天，红消香断有谁怜？" #文学 #红楼梦 #诗词' },
    { groupId: groupIds[2], userId: userIds[4], chapter: '秦汉篇', title: '为什么秦朝能统一六国？', content: '从商鞅变法到秦始皇的雄才大略，再到六国的各自为政...\n\n我认为最关键的是**制度优势**。#历史 #秦朝 #统一' },
    { groupId: groupIds[3], userId: userIds[0], chapter: '存在主义', title: '萨特的"存在先于本质"如何理解？', content: '存在主义的核心命题——人首先存在，然后通过自己的选择去定义自己的本质。\n\n这是不是意味着人有绝对的自由？#哲学 #萨特 #存在主义' }
  ];

  const postIds: number[] = [];
  for (const p of posts) {
    const result = await database.run(
      'INSERT INTO posts (group_id, user_id, chapter, title, content) VALUES (?, ?, ?, ?, ?)',
      p.groupId, p.userId, p.chapter, p.title, p.content
    );
    if (result.lastID) postIds.push(result.lastID);
  }

  const replies = [
    { postId: postIds[0], userId: userIds[1], content: '是啊，这个设定既黑暗又迷人！' },
    { postId: postIds[0], userId: userIds[2], content: '刘慈欣的想象力真的是天花板级别' },
    { postId: postIds[0], userId: userIds[3], content: '宇宙社会学两大公理推导出来的结果，逻辑严密' },
    { postId: postIds[2], userId: userIds[4], content: '马尔克斯的叙事方式太独特了' },
    { postId: postIds[4], userId: userIds[1], content: '奋六世之余烈，振长策而御宇内！' }
  ];

  for (const r of replies) {
    await database.run(
      'INSERT INTO replies (post_id, user_id, content) VALUES (?, ?, ?)',
      r.postId, r.userId, r.content
    );
    await database.run('UPDATE posts SET reply_count = reply_count + 1 WHERE id = ?', r.postId);
  }

  const books = [
    { id: 'b1', title: '三体', author: '刘慈欣', cover: '', tags: JSON.stringify(['科幻', '宇宙', '黑暗森林']), description: '中国科幻的巅峰之作' },
    { id: 'b2', title: '沙丘', author: '弗兰克·赫伯特', cover: '', tags: JSON.stringify(['科幻', '史诗', '政治']), description: '伟大的太空史诗' },
    { id: 'b3', title: '百年孤独', author: '加西亚·马尔克斯', cover: '', tags: JSON.stringify(['文学', '魔幻现实主义', '拉美']), description: '魔幻现实主义经典' },
    { id: 'b4', title: '红楼梦', author: '曹雪芹', cover: '', tags: JSON.stringify(['文学', '古典', '诗词']), description: '中国古典文学巅峰' },
    { id: 'b5', title: '人类简史', author: '尤瓦尔·赫拉利', cover: '', tags: JSON.stringify(['历史', '人类学', '哲学']), description: '从认知革命到生物工程' },
    { id: 'b6', title: '万历十五年', author: '黄仁宇', cover: '', tags: JSON.stringify(['历史', '明朝', '政治']), description: '大历史观的代表作' },
    { id: 'b7', title: '存在与时间', author: '海德格尔', cover: '', tags: JSON.stringify(['哲学', '存在主义', '现象学']), description: '20世纪最重要的哲学著作之一' },
    { id: 'b8', title: '基地', author: '阿西莫夫', cover: '', tags: JSON.stringify(['科幻', '心理史学', '银河帝国']), description: '银河帝国衰亡史' },
    { id: 'b9', title: '局外人', author: '加缪', cover: '', tags: JSON.stringify(['文学', '存在主义', '荒诞']), description: '西西弗斯神话的小说版' },
    { id: 'b10', title: '悉达多', author: '黑塞', cover: '', tags: JSON.stringify(['文学', '哲学', '心灵']), description: '自我的寻找与超越' }
  ];

  for (const b of books) {
    await database.run(
      'INSERT OR IGNORE INTO books (id, title, author, cover, tags, description) VALUES (?, ?, ?, ?, ?, ?)',
      b.id, b.title, b.author, b.cover, b.tags, b.description
    );
  }
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}
