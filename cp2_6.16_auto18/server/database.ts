import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'gardening.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS plants (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          scientific_name TEXT,
          image TEXT,
          description TEXT,
          light TEXT,
          water TEXT,
          temperature TEXT,
          soil TEXT,
          location TEXT,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS care_events (
          id TEXT PRIMARY KEY,
          plant_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('water', 'fertilize', 'prune', 'repot')),
          date TEXT NOT NULL,
          note TEXT,
          FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS growth_records (
          id TEXT PRIMARY KEY,
          plant_id TEXT NOT NULL,
          date TEXT NOT NULL,
          image TEXT,
          note TEXT,
          FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_events_plant_id ON care_events(plant_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_events_date ON care_events(date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_records_plant_id ON growth_records(plant_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_records_date ON growth_records(date)`);
    });

    resolve();
  });
}

export function runQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: any, err: Error | null) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function getQuery<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: T) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export default db;
