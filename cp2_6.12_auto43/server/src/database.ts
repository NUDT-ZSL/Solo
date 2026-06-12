import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'museum.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export interface Exhibition {
  id: number;
  name: string;
  description: string;
  theme_color: string;
  creator_name: string;
  creator_avatar: string;
  tags: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: number;
  exhibition_id: number;
  title: string;
  description: string;
  image_url: string;
  position_x: number;
  position_z: number;
  sort_order: number;
}

export interface User {
  id: number;
  username: string;
  avatar: string;
  created_at: string;
}

export interface Comment {
  id: number;
  exhibition_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username?: string;
  avatar?: string;
}

export interface Favorite {
  id: number;
  user_id: number;
  exhibition_id: number;
  created_at: string;
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exhibitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      theme_color TEXT DEFAULT '#3b82f6',
      creator_name TEXT,
      creator_avatar TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exhibition_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      position_x REAL DEFAULT 0,
      position_z REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exhibition_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exhibition_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE,
      UNIQUE(user_id, exhibition_id)
    );
  `);

  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (username, avatar) VALUES (?, ?)
  `);

  insertUser.run('博物馆管理员', '/uploads/avatar1.png');
  insertUser.run('艺术爱好者', '/uploads/avatar2.png');
  insertUser.run('历史学者', '/uploads/avatar3.png');

  const insertExhibition = db.prepare(`
    INSERT INTO exhibitions (name, description, theme_color, creator_name, creator_avatar, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const exhibitions = [
    {
      name: '古埃及文明展',
      description: '探索古埃及五千年文明的辉煌历史，欣赏神秘的金字塔、法老的黄金面具以及珍贵的壁画文物。',
      theme_color: '#d4a574',
      creator_name: '博物馆管理员',
      creator_avatar: '/uploads/avatar1.png',
      tags: JSON.stringify(['历史', '古埃及', '文物']),
      status: 'published' as const
    },
    {
      name: '现代艺术特展',
      description: '汇集当代最具影响力的艺术家作品，探索现代艺术的多元表达形式与创新理念。',
      theme_color: '#8b5cf6',
      creator_name: '艺术爱好者',
      creator_avatar: '/uploads/avatar2.png',
      tags: JSON.stringify(['艺术', '现代', '创意']),
      status: 'published' as const
    },
    {
      name: '中国古代科技展',
      description: '展示中国古代四大发明及领先世界的科技成就，感受古人的智慧与创造力。',
      theme_color: '#ef4444',
      creator_name: '历史学者',
      creator_avatar: '/uploads/avatar3.png',
      tags: JSON.stringify(['科技', '中国', '古代']),
      status: 'draft' as const
    }
  ];

  const exhibitionIds: number[] = [];
  for (const ex of exhibitions) {
    const result = insertExhibition.run(
      ex.name, ex.description, ex.theme_color,
      ex.creator_name, ex.creator_avatar, ex.tags, ex.status
    );
    exhibitionIds.push(Number(result.lastInsertRowid));
  }

  const insertArtifact = db.prepare(`
    INSERT INTO artifacts (exhibition_id, title, description, image_url, position_x, position_z, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const artifacts = [
    {
      exhibitionId: exhibitionIds[0],
      title: '图坦卡蒙黄金面具',
      description: '古埃及最著名的文物之一，重达11公斤的纯金面具，镶嵌着青金石和玻璃。',
      image_url: '/uploads/artifact1.jpg',
      position_x: -2,
      position_z: 0,
      sort_order: 1
    },
    {
      exhibitionId: exhibitionIds[0],
      title: '罗塞塔石碑',
      description: '刻有三种文字的玄武岩石碑，是解读古埃及象形文字的关键。',
      image_url: '/uploads/artifact2.jpg',
      position_x: 0,
      position_z: 2,
      sort_order: 2
    },
    {
      exhibitionId: exhibitionIds[0],
      title: '阿努比斯雕像',
      description: '古埃及冥界之神阿努比斯的完整雕像，守护着法老的陵墓。',
      image_url: '/uploads/artifact3.jpg',
      position_x: 2,
      position_z: 0,
      sort_order: 3
    },
    {
      exhibitionId: exhibitionIds[1],
      title: '星夜',
      description: '梵高最具代表性的作品之一，展现了漩涡般的星空与宁静的村庄。',
      image_url: '/uploads/artifact4.jpg',
      position_x: -2,
      position_z: 0,
      sort_order: 1
    },
    {
      exhibitionId: exhibitionIds[1],
      title: '记忆的永恒',
      description: '达利的超现实主义杰作，软化的时钟象征着时间的相对性。',
      image_url: '/uploads/artifact5.jpg',
      position_x: 0,
      position_z: 2,
      sort_order: 2
    },
    {
      exhibitionId: exhibitionIds[2],
      title: '司南',
      description: '中国古代最早的磁性指向仪器，是指南针的前身。',
      image_url: '/uploads/artifact6.jpg',
      position_x: -2,
      position_z: 0,
      sort_order: 1
    }
  ];

  for (const art of artifacts) {
    insertArtifact.run(
      art.exhibitionId, art.title, art.description, art.image_url,
      art.position_x, art.position_z, art.sort_order
    );
  }

  const insertComment = db.prepare(`
    INSERT INTO comments (exhibition_id, user_id, content)
    VALUES (?, ?, ?)
  `);

  const comments = [
    { exhibitionId: exhibitionIds[0], userId: 2, content: '太震撼了！第一次如此近距离地感受古埃及文明的魅力。' },
    { exhibitionId: exhibitionIds[0], userId: 3, content: '展品丰富，讲解详细，强烈推荐！' },
    { exhibitionId: exhibitionIds[1], userId: 1, content: '现代艺术的视觉盛宴，每一幅作品都发人深省。' }
  ];

  for (const c of comments) {
    insertComment.run(c.exhibitionId, c.userId, c.content);
  }

  const insertFavorite = db.prepare(`
    INSERT INTO favorites (user_id, exhibition_id) VALUES (?, ?)
  `);

  insertFavorite.run(2, exhibitionIds[0]);
  insertFavorite.run(2, exhibitionIds[1]);
  insertFavorite.run(3, exhibitionIds[2]);
}

export function getAllExhibitions(tag?: string): Exhibition[] {
  let sql = 'SELECT * FROM exhibitions';
  const params: any[] = [];
  
  if (tag) {
    sql += ' WHERE tags LIKE ?';
    params.push(`%${tag}%`);
  }
  
  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params) as Exhibition[];
}

export function getExhibitionById(id: number): Exhibition | undefined {
  return db.prepare('SELECT * FROM exhibitions WHERE id = ?').get(id) as Exhibition | undefined;
}

export function createExhibition(data: Omit<Exhibition, 'id' | 'created_at' | 'updated_at'>): Exhibition {
  const result = db.prepare(`
    INSERT INTO exhibitions (name, description, theme_color, creator_name, creator_avatar, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name, data.description, data.theme_color,
    data.creator_name, data.creator_avatar, data.tags, data.status
  );
  
  return getExhibitionById(Number(result.lastInsertRowid))!;
}

export function updateExhibition(id: number, data: Partial<Exhibition>): Exhibition | undefined {
  const fields = Object.keys(data)
    .filter(key => key !== 'id' && key !== 'created_at')
    .map(key => `${key} = ?`);
  
  if (fields.length === 0) return getExhibitionById(id);
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  
  const values = Object.values(data)
    .filter((_, index) => {
      const key = Object.keys(data)[index];
      return key !== 'id' && key !== 'created_at';
    });
  
  values.push(id);
  
  db.prepare(`UPDATE exhibitions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getExhibitionById(id);
}

export function deleteExhibition(id: number): boolean {
  const result = db.prepare('DELETE FROM exhibitions WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getArtifactsByExhibitionId(exhibitionId: number): Artifact[] {
  return db.prepare('SELECT * FROM artifacts WHERE exhibition_id = ? ORDER BY sort_order ASC, id ASC')
    .all(exhibitionId) as Artifact[];
}

export function getArtifactById(id: number): Artifact | undefined {
  return db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id) as Artifact | undefined;
}

export function createArtifact(data: Omit<Artifact, 'id'>): Artifact {
  const result = db.prepare(`
    INSERT INTO artifacts (exhibition_id, title, description, image_url, position_x, position_z, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.exhibition_id, data.title, data.description, data.image_url,
    data.position_x, data.position_z, data.sort_order
  );
  
  return getArtifactById(Number(result.lastInsertRowid))!;
}

export function updateArtifact(id: number, data: Partial<Artifact>): Artifact | undefined {
  const fields = Object.keys(data)
    .filter(key => key !== 'id')
    .map(key => `${key} = ?`);
  
  if (fields.length === 0) return getArtifactById(id);
  
  const values = Object.values(data)
    .filter((_, index) => Object.keys(data)[index] !== 'id');
  
  values.push(id);
  
  db.prepare(`UPDATE artifacts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getArtifactById(id);
}

export function deleteArtifact(id: number): boolean {
  const result = db.prepare('DELETE FROM artifacts WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getCommentsByExhibitionId(exhibitionId: number): Comment[] {
  return db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.exhibition_id = ?
    ORDER BY c.created_at DESC
  `).all(exhibitionId) as Comment[];
}

export function createComment(data: Omit<Comment, 'id' | 'created_at' | 'username' | 'avatar'>): Comment {
  const result = db.prepare(`
    INSERT INTO comments (exhibition_id, user_id, content)
    VALUES (?, ?, ?)
  `).run(data.exhibition_id, data.user_id, data.content);
  
  const commentId = Number(result.lastInsertRowid);
  return db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(commentId) as Comment;
}

export function deleteComment(id: number): boolean {
  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getFavoritesByUserId(userId: number): (Favorite & { exhibition?: Exhibition })[] {
  const favorites = db.prepare(`
    SELECT f.* FROM favorites f
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(userId) as Favorite[];
  
  return favorites.map(fav => {
    const exhibition = getExhibitionById(fav.exhibition_id);
    return { ...fav, exhibition };
  });
}

export function getFavorite(userId: number, exhibitionId: number): Favorite | undefined {
  return db.prepare('SELECT * FROM favorites WHERE user_id = ? AND exhibition_id = ?')
    .get(userId, exhibitionId) as Favorite | undefined;
}

export function createFavorite(userId: number, exhibitionId: number): Favorite | null {
  try {
    const result = db.prepare(`
      INSERT INTO favorites (user_id, exhibition_id) VALUES (?, ?)
    `).run(userId, exhibitionId);
    
    return db.prepare('SELECT * FROM favorites WHERE id = ?')
      .get(Number(result.lastInsertRowid)) as Favorite;
  } catch {
    return null;
  }
}

export function deleteFavorite(userId: number, exhibitionId: number): boolean {
  const result = db.prepare('DELETE FROM favorites WHERE user_id = ? AND exhibition_id = ?')
    .run(userId, exhibitionId);
  return result.changes > 0;
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserByUsername(username: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
}

export function createUser(data: Omit<User, 'id' | 'created_at'>): User {
  const result = db.prepare(`
    INSERT INTO users (username, avatar) VALUES (?, ?)
  `).run(data.username, data.avatar);
  
  return getUserById(Number(result.lastInsertRowid))!;
}

export default db;
