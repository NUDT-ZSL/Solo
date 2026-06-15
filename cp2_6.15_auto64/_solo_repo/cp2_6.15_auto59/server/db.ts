import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const DB_PATH = './mindmap.db';

let db: Database;

function saveDB() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

export async function initDB(): Promise<void> {
  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    text TEXT DEFAULT '',
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    parentId TEXT,
    style TEXT DEFAULT '{}',
    createdBy TEXT DEFAULT 'anonymous',
    updatedAt INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    nodeId TEXT UNIQUE,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    updatedAt INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS note_versions (
    id TEXT PRIMARY KEY,
    noteId TEXT,
    content TEXT DEFAULT '',
    createdAt INTEGER DEFAULT 0
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_nodeId ON notes(nodeId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_note_versions_noteId ON note_versions(noteId)`);
  saveDB();
}

export function all<T>(sql: string, params?: any[]): T[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function get<T>(sql: string, params?: any[]): T | undefined {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  let result: T | undefined;
  if (stmt.step()) {
    result = stmt.getAsObject() as T;
  }
  stmt.free();
  return result;
}

export function run(sql: string, params?: any[]): void {
  if (params) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
  saveDB();
}
