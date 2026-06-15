import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export interface Article {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  content: string;
  editor_nickname: string;
  created_at: string;
}

function getDbPath(): string {
  return path.join(__dirname, '..', 'wiki.db');
}

function initDatabase(): DatabaseType {
  const dbPath = getDbPath();

  try {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create database directory:', err);
    throw new Error('数据库目录创建失败，请检查权限');
  }

  let db: DatabaseType;
  try {
    db = new Database(dbPath);
  } catch (err: any) {
    if (err.code === 'SQLITE_CANTOPEN') {
      console.error('Cannot open database file. Check file permissions or corruption:', err.message);
      throw new Error(`数据库文件无法打开: ${err.message}`);
    }
    console.error('Failed to initialize database:', err);
    throw new Error(`数据库初始化失败: ${err.message}`);
  }

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS versions (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        editor_nickname TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_versions_article_id ON versions(article_id);
      CREATE INDEX IF NOT EXISTS idx_articles_title ON articles(title);
    `);
  } catch (err: any) {
    console.error('Failed to create tables/indexes:', err);
    db.close();
    throw new Error(`表结构初始化失败: ${err.message}`);
  }

  return db;
}

let db: DatabaseType;
try {
  db = initDatabase();
} catch (err: any) {
  console.error('Fatal database error during startup:', err.message);
  process.exit(1);
}

process.on('exit', () => {
  if (db && db.open) {
    try { db.close(); } catch (_) { /* ignore */ }
  }
});

export function getAllArticles(search?: string): Article[] {
  try {
    if (search && search.trim()) {
      const stmt = db.prepare(`
        SELECT * FROM articles 
        WHERE title LIKE ? 
        ORDER BY updated_at DESC
      `);
      return stmt.all(`%${search.trim()}%`) as Article[];
    }
    const stmt = db.prepare('SELECT * FROM articles ORDER BY updated_at DESC');
    return stmt.all() as Article[];
  } catch (err: any) {
    console.error('getAllArticles error:', err.message);
    throw new Error('查询词条列表失败');
  }
}

export function getArticleById(id: string): Article | undefined {
  try {
    const stmt = db.prepare('SELECT * FROM articles WHERE id = ?');
    return stmt.get(id) as Article | undefined;
  } catch (err: any) {
    console.error('getArticleById error:', err.message);
    throw new Error('查询词条失败');
  }
}

export function createArticle(
  title: string,
  content: string,
  editorNickname: string
): Article {
  const now = new Date().toISOString();
  const id = uuidv4();

  const insertArticle = db.prepare(`
    INSERT INTO articles (id, title, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertVersion = db.prepare(`
    INSERT INTO versions (id, article_id, version_number, title, content, editor_nickname, created_at)
    VALUES (?, ?, 1, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertArticle.run(id, title, content, now, now);
    insertVersion.run(uuidv4(), id, title, content, editorNickname, now);
  });

  try {
    transaction();
  } catch (err: any) {
    console.error('createArticle transaction error:', err.message);
    throw new Error('创建词条失败');
  }

  return { id, title, content, created_at: now, updated_at: now };
}

export function updateArticle(
  id: string,
  title: string,
  content: string,
  editorNickname: string
): Article | undefined {
  const article = getArticleById(id);
  if (!article) return undefined;

  const now = new Date().toISOString();

  const getMaxVersion = db.prepare(`
    SELECT COALESCE(MAX(version_number), 0) as max_num FROM versions WHERE article_id = ?
  `);
  const { max_num } = getMaxVersion.get(id) as { max_num: number };
  const newVersionNumber = max_num + 1;

  const insertVersion = db.prepare(`
    INSERT INTO versions (id, article_id, version_number, title, content, editor_nickname, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateArticleStmt = db.prepare(`
    UPDATE articles SET title = ?, content = ?, updated_at = ? WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    insertVersion.run(
      uuidv4(),
      id,
      newVersionNumber,
      article.title,
      article.content,
      editorNickname,
      now
    );
    updateArticleStmt.run(title, content, now, id);
  });

  try {
    transaction();
  } catch (err: any) {
    console.error('updateArticle transaction error:', err.message);
    throw new Error('更新词条失败');
  }

  return { ...article, title, content, updated_at: now };
}

export function getVersionsByArticleId(articleId: string): Version[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM versions 
      WHERE article_id = ? 
      ORDER BY version_number DESC
    `);
    return stmt.all(articleId) as Version[];
  } catch (err: any) {
    console.error('getVersionsByArticleId error:', err.message);
    throw new Error('查询版本历史失败');
  }
}

export function getVersionById(versionId: string): Version | undefined {
  try {
    const stmt = db.prepare('SELECT * FROM versions WHERE id = ?');
    return stmt.get(versionId) as Version | undefined;
  } catch (err: any) {
    console.error('getVersionById error:', err.message);
    throw new Error('查询版本失败');
  }
}

export function restoreVersion(
  articleId: string,
  versionId: string,
  editorNickname: string
): Article | undefined {
  const article = getArticleById(articleId);
  const version = getVersionById(versionId);
  if (!article || !version) return undefined;

  const now = new Date().toISOString();

  const getMaxVersion = db.prepare(`
    SELECT COALESCE(MAX(version_number), 0) as max_num FROM versions WHERE article_id = ?
  `);
  const { max_num } = getMaxVersion.get(articleId) as { max_num: number };
  const newVersionNumber = max_num + 1;

  const insertVersion = db.prepare(`
    INSERT INTO versions (id, article_id, version_number, title, content, editor_nickname, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateArticleStmt = db.prepare(`
    UPDATE articles SET title = ?, content = ?, updated_at = ? WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    insertVersion.run(
      uuidv4(),
      articleId,
      newVersionNumber,
      article.title,
      article.content,
      editorNickname,
      now
    );
    updateArticleStmt.run(version.title, version.content, now, articleId);
  });

  try {
    transaction();
  } catch (err: any) {
    console.error('restoreVersion transaction error:', err.message);
    throw new Error('回滚版本失败');
  }

  return {
    ...article,
    title: version.title,
    content: version.content,
    updated_at: now
  };
}
