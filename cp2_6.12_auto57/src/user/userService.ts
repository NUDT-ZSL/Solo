import { v4 as uuidv4 } from 'uuid';
import { getDb, rowToUser } from '../database';
import type { User } from '../types';

export function registerUser(username: string, password: string, role: 'reader' | 'admin' = 'reader'): { user: User; token: string } {
  const db = getDb();

  const existing = db.exec('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    throw new Error('用户名已存在');
  }

  const id = uuidv4();
  const token = uuidv4();

  db.run(
    `INSERT INTO users (id, username, password, role, token) VALUES (?, ?, ?, ?, ?)`,
    [id, username, password, role, token]
  );

  const result = db.exec('SELECT id, username, password, role, token FROM users WHERE id = ?', [id]);
  const user = rowToUser(result[0].values[0]);

  return { user, token };
}

export function loginUser(username: string, password: string): { user: User; token: string } {
  const db = getDb();

  const result = db.exec(
    'SELECT id, username, password, role, token FROM users WHERE username = ? AND password = ?',
    [username, password]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('用户名或密码错误');
  }

  let user = rowToUser(result[0].values[0]);

  if (!user.token) {
    const newToken = uuidv4();
    db.run('UPDATE users SET token = ? WHERE id = ?', [newToken, user.id]);
    user = { ...user, token: newToken };
  }

  return { user, token: user.token! };
}

export function getUserById(id: string): User | null {
  const db = getDb();

  const result = db.exec(
    'SELECT id, username, password, role, token FROM users WHERE id = ?',
    [id]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToUser(result[0].values[0]);
}

export function getUserByToken(token: string): User | null {
  const db = getDb();

  const result = db.exec(
    'SELECT id, username, password, role, token FROM users WHERE token = ?',
    [token]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToUser(result[0].values[0]);
}

export function getAllUsers(): User[] {
  const db = getDb();

  const result = db.exec('SELECT id, username, password, role, token FROM users');

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(rowToUser);
}
