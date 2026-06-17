import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'platform.db');

let db: sqlite3.Database;

export function getDb(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection failed:', err.message);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

export function initDb(): Promise<void> {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS works (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          style TEXT DEFAULT '',
          price REAL NOT NULL,
          author_id TEXT NOT NULL,
          image_path TEXT NOT NULL,
          watermarked_path TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (author_id) REFERENCES users(id)
        )
      `);

      database.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          work_id TEXT NOT NULL,
          amount REAL NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (work_id) REFERENCES works(id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}
