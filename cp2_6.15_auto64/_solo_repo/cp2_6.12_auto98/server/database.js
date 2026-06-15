import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const DB_PATH = './data/storyloom.db';

export async function initDatabase() {
  const SQL = await initSqlJs();

  let db;
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      roomCode TEXT UNIQUE NOT NULL,
      theme TEXT NOT NULL,
      creatorName TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      roomId TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      roomId TEXT NOT NULL,
      userName TEXT NOT NULL,
      joinedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  persist(db);
  return db;
}

export function persist(db) {
  if (!existsSync('./data')) {
    mkdirSync('./data', { recursive: true });
  }
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryRun(db, sql, params = []) {
  db.run(sql, params);
  persist(db);
}

export function queryGet(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result;
  }
  stmt.free();
  return null;
}
