import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'museum.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export interface Exhibition {
  id: string;
  name: string;
  description: string;
  theme_color: string;
  tags: string;
  status: 'draft' | 'published' | 'archived';
  creator_id: string;
  creator_name: string;
  creator_avatar: string;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  exhibition_id: string;
  title: string;
  description: string;
  image_url: string;
  position_x: number;
  position_z: number;
  sort_order: number;
  created_at: string;
}

export interface Comment {
  id: string;
  exhibition_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  exhibition_id: string;
  created_at: string;
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exhibitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      theme_color TEXT NOT NULL DEFAULT '暖阳橙',
      tags TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      creator_id TEXT NOT NULL,
      creator_name TEXT NOT NULL DEFAULT '匿名用户',
      creator_avatar TEXT NOT NULL DEFAULT '',
      cover_image TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      exhibition_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      position_x REAL NOT NULL DEFAULT 0,
      position_z REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      exhibition_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_avatar TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exhibition_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, exhibition_id),
      FOREIGN KEY (exhibition_id) REFERENCES exhibitions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_artifacts_exhibition ON artifacts(exhibition_id);
    CREATE INDEX IF NOT EXISTS idx_comments_exhibition ON comments(exhibition_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
  `);
}

export function getAllExhibitions(tag?: string): (Exhibition & { artifact_count: number })[] {
  let sql = `
    SELECT e.*, COUNT(a.id) as artifact_count
    FROM exhibitions e
    LEFT JOIN artifacts a ON e.id = a.exhibition_id
    WHERE e.status = 'published'
  `;
  const params: (string | number)[] = [];

  if (tag && tag.trim()) {
    sql += ` AND e.tags LIKE ?`;
    params.push(`%${tag}%`);
  }

  sql += ` GROUP BY e.id ORDER BY e.created_at DESC`;

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    ...row,
    artifact_count: row.artifact_count || 0
  }));
}

export function getExhibitionById(id: string): (Exhibition & { artifact_count: number }) | null {
  const stmt = db.prepare(`
    SELECT e.*, COUNT(a.id) as artifact_count
    FROM exhibitions e
    LEFT JOIN artifacts a ON e.id = a.exhibition_id
    WHERE e.id = ?
    GROUP BY e.id
  `);
  const row = stmt.get(id) as any;
  if (!row) return null;
  return { ...row, artifact_count: row.artifact_count || 0 };
}

export function getExhibitionsByCreator(creatorId: string): Exhibition[] {
  const stmt = db.prepare(`
    SELECT * FROM exhibitions
    WHERE creator_id = ?
    ORDER BY updated_at DESC
  `);
  return stmt.all(creatorId) as Exhibition[];
}

export function createExhibition(data: Omit<Exhibition, 'created_at' | 'updated_at'>): Exhibition {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO exhibitions (
      id, name, description, theme_color, tags, status,
      creator_id, creator_name, creator_avatar, cover_image,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.id, data.name, data.description, data.theme_color, data.tags,
    data.status, data.creator_id, data.creator_name, data.creator_avatar,
    data.cover_image, now, now
  );
  return { ...data, created_at: now, updated_at: now };
}

export function updateExhibition(id: string, data: Partial<Omit<Exhibition, 'id' | 'created_at'>>): void {
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.theme_color !== undefined) { fields.push('theme_color = ?'); values.push(data.theme_color); }
  if (data.tags !== undefined) { fields.push('tags = ?'); values.push(data.tags); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.cover_image !== undefined) { fields.push('cover_image = ?'); values.push(data.cover_image); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const stmt = db.prepare(`UPDATE exhibitions SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function deleteExhibition(id: string): void {
  const stmt = db.prepare('DELETE FROM exhibitions WHERE id = ?');
  stmt.run(id);
}

export function getArtifactsByExhibition(exhibitionId: string): Artifact[] {
  const stmt = db.prepare(`
    SELECT * FROM artifacts
    WHERE exhibition_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `);
  return stmt.all(exhibitionId) as Artifact[];
}

export function createArtifact(data: Omit<Artifact, 'created_at'>): Artifact {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO artifacts (
      id, exhibition_id, title, description, image_url,
      position_x, position_z, sort_order, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.id, data.exhibition_id, data.title, data.description,
    data.image_url, data.position_x, data.position_z,
    data.sort_order, now
  );
  return { ...data, created_at: now };
}

export function updateArtifact(id: string, data: Partial<Omit<Artifact, 'id' | 'exhibition_id' | 'created_at'>>): void {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url); }
  if (data.position_x !== undefined) { fields.push('position_x = ?'); values.push(data.position_x); }
  if (data.position_z !== undefined) { fields.push('position_z = ?'); values.push(data.position_z); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

  values.push(id);
  const stmt = db.prepare(`UPDATE artifacts SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function deleteArtifactsByExhibition(exhibitionId: string): void {
  const stmt = db.prepare('DELETE FROM artifacts WHERE exhibition_id = ?');
  stmt.run(exhibitionId);
}

export function deleteArtifact(id: string): void {
  const stmt = db.prepare('DELETE FROM artifacts WHERE id = ?');
  stmt.run(id);
}

export function getCommentsByExhibition(exhibitionId: string): Comment[] {
  const stmt = db.prepare(`
    SELECT * FROM comments
    WHERE exhibition_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(exhibitionId) as Comment[];
}

export function createComment(data: Omit<Comment, 'created_at'>): Comment {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO comments (id, exhibition_id, user_id, user_name, user_avatar, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.id, data.exhibition_id, data.user_id,
    data.user_name, data.user_avatar, data.content, now
  );
  return { ...data, created_at: now };
}

export function getFavoritesByUser(userId: string): (Favorite & Exhibition)[] {
  const stmt = db.prepare(`
    SELECT f.*, e.name, e.description, e.theme_color, e.tags, e.status,
           e.creator_id, e.creator_name, e.creator_avatar, e.cover_image,
           e.created_at as ex_created_at, e.updated_at
    FROM favorites f
    JOIN exhibitions e ON f.exhibition_id = e.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `);
  return stmt.all(userId) as any[];
}

export function isFavorite(userId: string, exhibitionId: string): boolean {
  const stmt = db.prepare(`
    SELECT 1 FROM favorites WHERE user_id = ? AND exhibition_id = ?
  `);
  return !!stmt.get(userId, exhibitionId);
}

export function createFavorite(userId: string, exhibitionId: string): Favorite {
  const id = require('uuid').v4();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO favorites (id, user_id, exhibition_id, created_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, userId, exhibitionId, now);
  return { id, user_id: userId, exhibition_id, created_at: now };
}

export function deleteFavorite(userId: string, exhibitionId: string): void {
  const stmt = db.prepare(`
    DELETE FROM favorites WHERE user_id = ? AND exhibition_id = ?
  `);
  stmt.run(userId, exhibitionId);
}
