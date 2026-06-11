import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

let db: Database | null = null;
let dbReady: Promise<Database> | null = null;

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

async function initDb(): Promise<Database> {
  const database = await open({
    filename: getDbPath(),
    driver: sqlite3.Database
  });

  await database.exec(`
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

  return database;
}

export async function getDb(): Promise<Database> {
  if (!dbReady) {
    dbReady = initDb();
  }
  if (!db) {
    db = await dbReady;
  }
  return db;
}

export async function getAllArticles(search?: string): Promise<Article[]> {
  const database = await getDb();
  if (search && search.trim()) {
    return database.all<Article[]>(
      'SELECT * FROM articles WHERE title LIKE ? ORDER BY updated_at DESC',
      [`%${search.trim()}%`]
    );
  }
  return database.all<Article[]>('SELECT * FROM articles ORDER BY updated_at DESC');
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  const database = await getDb();
  const result = await database.get<Article>('SELECT * FROM articles WHERE id = ?', [id]);
  return result;
}

export async function createArticle(
  title: string,
  content: string,
  editorNickname: string
): Promise<Article> {
  const database = await getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  await database.run(
    'INSERT INTO articles (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, title, content, now, now]
  );

  await database.run(
    'INSERT INTO versions (id, article_id, version_number, title, content, editor_nickname, created_at) VALUES (?, ?, 1, ?, ?, ?, ?)',
    [uuidv4(), id, title, content, editorNickname, now]
  );

  return { id, title, content, created_at: now, updated_at: now };
}

export async function updateArticle(
  id: string,
  title: string,
  content: string,
  editorNickname: string
): Promise<Article | undefined> {
  const database = await getDb();
  const article = await getArticleById(id);
  if (!article) return undefined;

  const now = new Date().toISOString();

  const maxResult = await database.get<{ max_num: number }>(
    'SELECT COALESCE(MAX(version_number), 0) as max_num FROM versions WHERE article_id = ?',
    [id]
  );
  const newVersionNumber = (maxResult?.max_num || 0) + 1;

  await database.run(
    'INSERT INTO versions (id, article_id, version_number, title, content, editor_nickname, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), id, newVersionNumber, article.title, article.content, editorNickname, now]
  );

  await database.run(
    'UPDATE articles SET title = ?, content = ?, updated_at = ? WHERE id = ?',
    [title, content, now, id]
  );

  return { ...article, title, content, updated_at: now };
}

export async function getVersionsByArticleId(articleId: string): Promise<Version[]> {
  const database = await getDb();
  return database.all<Version[]>(
    'SELECT * FROM versions WHERE article_id = ? ORDER BY version_number DESC',
    [articleId]
  );
}

export async function getVersionById(versionId: string): Promise<Version | undefined> {
  const database = await getDb();
  const result = await database.get<Version>('SELECT * FROM versions WHERE id = ?', [versionId]);
  return result;
}

export async function restoreVersion(
  articleId: string,
  versionId: string,
  editorNickname: string
): Promise<Article | undefined> {
  const database = await getDb();
  const article = await getArticleById(articleId);
  const version = await getVersionById(versionId);
  if (!article || !version) return undefined;

  const now = new Date().toISOString();

  const maxResult = await database.get<{ max_num: number }>(
    'SELECT COALESCE(MAX(version_number), 0) as max_num FROM versions WHERE article_id = ?',
    [articleId]
  );
  const newVersionNumber = (maxResult?.max_num || 0) + 1;

  await database.run(
    'INSERT INTO versions (id, article_id, version_number, title, content, editor_nickname, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), articleId, newVersionNumber, article.title, article.content, editorNickname, now]
  );

  await database.run(
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
