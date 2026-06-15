import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/story.db');

let db: Database.Database;

export function initDatabase(): Database.Database {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export function saveProject(id: string, name: string, data: string): void {
  const d = getDatabase();
  const now = Date.now();
  const existing = d.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (existing) {
    d.prepare('UPDATE projects SET name = ?, data = ?, updated_at = ? WHERE id = ?').run(name, data, now, id);
  } else {
    d.prepare('INSERT INTO projects (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, name, data, now, now);
  }
}

export function getProject(id: string): { id: string; name: string; data: string; created_at: number; updated_at: number } | undefined {
  return getDatabase().prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
}

export function getAllProjects(): Array<{ id: string; name: string; created_at: number; updated_at: number }> {
  return getDatabase().prepare('SELECT id, name, created_at, updated_at FROM projects').all() as any[];
}

export function deleteProject(id: string): void {
  getDatabase().prepare('DELETE FROM projects WHERE id = ?').run(id);
}
