import initSqlJs, { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;
let dbReady: Promise<void> | null = null;

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

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(getDbPath(), buffer);
}

async function initDb(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
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
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_versions_article_id ON versions(article_id);
    CREATE INDEX IF NOT EXISTS idx_articles_title ON articles(title);
  `);

  saveDb();
}

function ensureDb(): Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function getDbReady(): Promise<void> {
  if (!dbReady) {
    dbReady = initDb();
  }
  return dbReady;
}

function queryAll<T>(sql: string, params: any[] = []): T[] {
  const database = ensureDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  const results = queryAll<T>(sql, params);
  return results[0];
}

function run(sql: string, params: any[] = []): void {
  const database = ensureDb();
  database.run(sql, params);
  saveDb();
}

export function getAllArticles(search?: string): Article[] {
  if (search && search.trim()) {
    return queryAll<Article>(
      'SELECT * FROM articles WHERE title LIKE ? ORDER BY updated_at DESC',
      [`%${search.trim()}%`]
    );
  }
  return queryAll<Article>('SELECT * FROM articles ORDER BY updated_at DESC');
}

export function getArticleById(id: string): Article | undefined {
  return queryOne<Article>('SELECT * FROM articles WHERE id = ?', [id]);
}

export function createArticle(
  title: string,
  content: string,
  editorNickname: string
): Article {
  const now = new Date().toISOString();
  const id = uuidv4();

  run(
    'INSERT INTO articles (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, title, content, now, now]
  );

  run(
    'INSERT INTO versions (id, article_id, version_number, title, content, editor_nickname, created_at) VALUES (?, ?, 1, ?, ?, ?, ?)',
    [uuidv4(), id, title, content, editorNickname, now]
  );

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

  const { max_num } = queryOne<{ max_num: number }>(
    'SELECT COALESCE(MAX(version_number), 0) as max_num FROM versions WHERE article_id = ?',
    [id]
  ) || { max_num: 0 };

  const newVersionNumber = (max_num || 0) + 1;

  run(
    'INSERT INTO versions (id, article_id, version_number, title, content, editor_nickname, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), id, newVersionNumber, article.title, article.content, editorNickname, now]
  );

  run(
    'UPDATE articles SET title = ?, content = ?, updated_at = ? WHERE id = ?',
    [title, content, now, id]
  );

  return { ...article, title, content, updated_at: now };
}

export function getVersionsByArticleId(articleId: string): Version[] {
  return queryAll<Version>(
    'SELECT * FROM versions WHERE article_id = ? ORDER BY version_number DESC',
    [articleId]
  );
}

export function getVersionById(versionId: string): Version | undefined {
  return queryOne<Version>('SELECT * FROM versions WHERE id = ?', [versionId]);
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

  const { max_num } = queryOne<{ max_num: number }>(
    'SELECT COALESCE(MAX(version_number), 0) as max_num FROM versions WHERE article_id = ?',
    [articleId]
  ) || { max_num: 0 };

  const newVersionNumber = (max_num || 0) + 1;

  run(
    'INSERT INTO versions (id, article_id, version_number, title, content, editor_nickname, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), articleId, newVersionNumber, article.title, article.content, editorNickname, now]
  );

  run(
    'UPDATE articles SET title = ?, content = ?, updated_at = ? WHERE id = ?',
    [version.title, version.content, now, articleId]
  );

  return {
    ...article,
    title: version.title,
    content: version.content,
    updated_at: now
  };
}
