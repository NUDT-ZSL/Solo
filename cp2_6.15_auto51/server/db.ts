import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'data.db');
const WASM_PATH = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

export interface ConfigRow {
  id: number;
  platform_id: string;
  token: string | null;
  created_at: string;
  updated_at: string;
}

async function loadDBFromFile(): Promise<Uint8Array | null> {
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      return new Uint8Array(buffer);
    }
  } catch {
    // ignore
  }
  return null;
}

function saveDBToFile(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buffer);
}

export async function initDB(): Promise<void> {
  if (db) return;

  SQL = await initSqlJs({
    locateFile: () => WASM_PATH,
  });

  const existingData = await loadDBFromFile();
  db = new SQL.Database(existingData);

  db.run(`
    CREATE TABLE IF NOT EXISTS configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id TEXT NOT NULL UNIQUE,
      token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  saveDBToFile();
}

export function saveConfig(platformId: string, token: string): void {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }

  const existing = db.exec('SELECT id FROM configs WHERE platform_id = ?', [platformId]);

  if (existing.length > 0 && existing[0].values.length > 0) {
    db.run(
      'UPDATE configs SET token = ?, updated_at = CURRENT_TIMESTAMP WHERE platform_id = ?',
      [token, platformId]
    );
  } else {
    db.run(
      'INSERT INTO configs (platform_id, token) VALUES (?, ?)',
      [platformId, token]
    );
  }

  saveDBToFile();
}

export function getConfigs(): ConfigRow[] {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }

  const results = db.exec(
    'SELECT id, platform_id, token, created_at, updated_at FROM configs ORDER BY id'
  );

  if (results.length === 0) {
    return [];
  }

  const { columns, values } = results[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as ConfigRow;
  });
}

export function getConfigByPlatformId(platformId: string): ConfigRow | null {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }

  const results = db.exec(
    'SELECT id, platform_id, token, created_at, updated_at FROM configs WHERE platform_id = ?',
    [platformId]
  );

  if (results.length === 0 || results[0].values.length === 0) {
    return null;
  }

  const { columns, values } = results[0];
  const row = values[0];
  const obj: Record<string, unknown> = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj as ConfigRow;
}

export function deleteConfig(platformId: string): boolean {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }

  db.run('DELETE FROM configs WHERE platform_id = ?', [platformId]);
  saveDBToFile();
  return db.getRowsModified() > 0;
}

export function closeDB(): void {
  if (db) {
    saveDBToFile();
    db.close();
    db = null;
  }
}
