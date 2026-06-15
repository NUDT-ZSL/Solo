import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface GameSave {
  id: string;
  grid_data: string;
  stats: string;
  created_at: string;
  updated_at: string;
}

export interface EventLog {
  id: number;
  save_id: string;
  event_type: string;
  event_data: string;
  created_at: string;
}

class GameDatabase {
  private db: Database.Database | null = null;

  initDb(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const dbPath = path.join(DATA_DIR, 'game.db');
    this.db = new Database(dbPath);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS saves (
        id TEXT PRIMARY KEY,
        grid_data TEXT,
        stats TEXT,
        created_at DATETIME,
        updated_at DATETIME
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        save_id TEXT,
        event_type TEXT,
        event_data TEXT,
        created_at DATETIME,
        FOREIGN KEY (save_id) REFERENCES saves(id)
      );
    `);
  }

  private getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initDb() first.');
    }
    return this.db;
  }

  saveGame(saveId: string | undefined, gridData: string, stats: string): string {
    const db = this.getDb();
    const now = new Date().toISOString();
    const finalSaveId = saveId || uuidv4();

    const existing = db.prepare('SELECT id FROM saves WHERE id = ?').get(finalSaveId) as { id: string } | undefined;

    if (existing) {
      const stmt = db.prepare(`
        UPDATE saves 
        SET grid_data = ?, stats = ?, updated_at = ? 
        WHERE id = ?
      `);
      stmt.run(gridData, stats, now, finalSaveId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO saves (id, grid_data, stats, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(finalSaveId, gridData, stats, now, now);
    }

    return finalSaveId;
  }

  loadGame(saveId: string): GameSave | null {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM saves WHERE id = ?');
    const result = stmt.get(saveId) as GameSave | undefined;
    return result || null;
  }

  logEvent(saveId: string, eventType: string, eventData: string): number {
    const db = this.getDb();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO event_logs (save_id, event_type, event_data, created_at)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(saveId, eventType, eventData, now);
    return Number(result.lastInsertRowid);
  }

  getEvents(saveId: string): EventLog[] {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM event_logs WHERE save_id = ? ORDER BY created_at DESC');
    const results = stmt.all(saveId) as EventLog[];
    return results;
  }
}

const gameDb = new GameDatabase();

export default gameDb;
export { GameDatabase };
