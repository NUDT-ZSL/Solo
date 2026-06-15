import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'whiteboard.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT,
      snapshot_data BLOB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      color TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      operation_type TEXT NOT NULL,
      operation_data TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(room_id, sequence)
    );

    CREATE INDEX IF NOT EXISTS idx_operations_room_sequence ON operations(room_id, sequence);
    CREATE INDEX IF NOT EXISTS idx_users_room ON users(room_id);
  `);
}

initDatabase();

export function getOrCreateRoom(roomId: string, name?: string) {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room) {
    db.prepare('INSERT INTO rooms (id, name) VALUES (?, ?)').run(roomId, name || roomId);
    return { id: roomId, name: name || roomId, snapshot_data: null };
  }
  return room;
}

export function saveUser(userId: string, roomId: string, nickname: string, color: string) {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (existing) {
    db.prepare('UPDATE users SET nickname = ?, color = ?, room_id = ? WHERE id = ?').run(
      nickname, color, roomId, userId
    );
  } else {
    db.prepare('INSERT INTO users (id, room_id, nickname, color) VALUES (?, ?, ?, ?)').run(
      userId, roomId, nickname, color
    );
  }
}

export function saveOperation(
  id: string,
  roomId: string,
  userId: string,
  sequence: number,
  operationType: string,
  operationData: string
) {
  db.prepare(
    'INSERT INTO operations (id, room_id, user_id, sequence, operation_type, operation_data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, roomId, userId, sequence, operationType, operationData);
  
  db.prepare('UPDATE rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(roomId);
}

export function getOperationsByRoom(roomId: string, limit?: number) {
  let query = 'SELECT * FROM operations WHERE room_id = ? ORDER BY sequence ASC';
  const params: any[] = [roomId];
  
  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }
  
  return db.prepare(query).all(...params) as any[];
}

export function getOperationCount(roomId: string): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM operations WHERE room_id = ?').get(roomId) as any;
  return result?.count || 0;
}

export function saveSnapshot(roomId: string, snapshotData: Buffer) {
  db.prepare('UPDATE rooms SET snapshot_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    snapshotData, roomId
  );
}

export function getSnapshot(roomId: string): Buffer | null {
  const result = db.prepare('SELECT snapshot_data FROM rooms WHERE id = ?').get(roomId) as any;
  return result?.snapshot_data || null;
}

export function getUsersByRoom(roomId: string) {
  return db.prepare('SELECT * FROM users WHERE room_id = ? ORDER BY joined_at ASC').all(roomId) as any[];
}

export function clearRoomOperations(roomId: string) {
  db.prepare('DELETE FROM operations WHERE room_id = ?').run(roomId);
  db.prepare('UPDATE rooms SET snapshot_data = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(roomId);
}

export default db;
