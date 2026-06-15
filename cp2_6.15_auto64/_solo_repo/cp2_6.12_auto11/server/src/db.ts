import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

export interface Todo {
  id: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  tags: string;
  date: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'memo.db');

let db: Database | null = null;

const saveToDisk = () => {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

const initDB = async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium',
      tags TEXT DEFAULT '',
      date TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_date ON todos(date);`);
  saveToDisk();

  return db;
};

const queryAll = <T = any>(sql: string, params: any[] = []): T[] => {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
};

const queryOne = <T = any>(sql: string, params: any[] = []): T | null => {
  const results = queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
};

export const getTodosByDate = (date: string): Todo[] => {
  return queryAll<Todo>(
    'SELECT * FROM todos WHERE date = ? ORDER BY order_index ASC, id ASC',
    [date]
  );
};

export const getTodosByDateRange = (startDate: string, endDate: string): Todo[] => {
  return queryAll<Todo>(
    'SELECT * FROM todos WHERE date >= ? AND date <= ? ORDER BY date ASC, order_index ASC, id ASC',
    [startDate, endDate]
  );
};

export const createTodo = (data: Omit<Todo, 'id' | 'created_at' | 'updated_at'>): Todo => {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(
    `INSERT INTO todos (title, description, priority, tags, date, order_index)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  stmt.run([data.title, data.description, data.priority, data.tags, data.date, data.order_index]);
  stmt.free();
  
  const lastId = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
  const id = lastId?.id || 0;
  saveToDisk();
  
  return queryOne<Todo>('SELECT * FROM todos WHERE id = ?', [id]) as Todo;
};

export const updateTodo = (id: number, data: Partial<Omit<Todo, 'id' | 'created_at' | 'updated_at'>>): Todo => {
  if (!db) throw new Error('Database not initialized');
  
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = Object.values(data);
  
  const stmt = db.prepare(
    `UPDATE todos SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  );
  stmt.run([...values, id]);
  stmt.free();
  saveToDisk();
  
  return queryOne<Todo>('SELECT * FROM todos WHERE id = ?', [id]) as Todo;
};

export const deleteTodo = (id: number): boolean => {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare('DELETE FROM todos WHERE id = ?');
  stmt.run([id]);
  stmt.free();
  saveToDisk();
  
  const changes = db.getRowsModified();
  return changes > 0;
};

export const reorderTodos = (date: string, orderedIds: number[]): void => {
  if (!db) throw new Error('Database not initialized');
  
  orderedIds.forEach((id, index) => {
    const stmt = db.prepare(
      'UPDATE todos SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run([index, id]);
    stmt.free();
  });
  
  saveToDisk();
};

export { initDB };
export default db;
