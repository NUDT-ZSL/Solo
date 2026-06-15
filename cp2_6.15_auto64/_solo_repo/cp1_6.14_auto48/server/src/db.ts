import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const dbPath = join(process.cwd(), 'server', 'data', 'tribetales.db');
  mkdirSync(dirname(dbPath), { recursive: true });
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  return dbInstance;
}

export function initDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      inviteCode TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      color TEXT NOT NULL,
      storyId TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (storyId) REFERENCES stories(id)
    );

    CREATE TABLE IF NOT EXISTS story_nodes (
      id TEXT PRIMARY KEY,
      storyId TEXT NOT NULL,
      parentId TEXT,
      content TEXT NOT NULL,
      imageUrl TEXT,
      authorId TEXT NOT NULL,
      generation INTEGER DEFAULT 0,
      positionX INTEGER DEFAULT 0,
      positionY INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (storyId) REFERENCES stories(id),
      FOREIGN KEY (parentId) REFERENCES story_nodes(id),
      FOREIGN KEY (authorId) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_story ON story_nodes(storyId);
    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON story_nodes(parentId);
    CREATE INDEX IF NOT EXISTS idx_users_story ON users(storyId);
  `);
}
