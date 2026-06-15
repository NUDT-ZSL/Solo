import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Material {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url: string | null;
  tags: string[];
  created_at: string;
  favorited: boolean;
}

export interface Board {
  id: string;
  title: string;
  layout: string;
  created_at: string;
}

export interface BoardWithMaterials extends Board {
  materials: Material[];
}

const dbPath = path.join(process.cwd(), 'data', 'inspiration.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('image', 'video')),
      url TEXT NOT NULL,
      thumbnail_url TEXT,
      favorited INTEGER DEFAULT 0,
      created_at TEXT DEFAULT datetime('now')
    );

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      layout TEXT DEFAULT '[]',
      created_at TEXT DEFAULT datetime('now')
    );

    CREATE TABLE IF NOT EXISTS board_materials (
      board_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      added_at TEXT DEFAULT datetime('now'),
      PRIMARY KEY (board_id, material_id),
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      material_id TEXT NOT NULL,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    );
  `);
}

function rowToMaterial(row: any, tags: string[] = []): Material {
  return {
    id: row.id,
    title: row.title,
    type: row.type as 'image' | 'video',
    url: row.url,
    thumbnail_url: row.thumbnail_url,
    tags,
    created_at: row.created_at,
    favorited: row.favorited === 1,
  };
}

function rowToBoard(row: any): Board {
  return {
    id: row.id,
    title: row.title,
    layout: row.layout,
    created_at: row.created_at,
  };
}

function getTagsForMaterial(materialId: string): string[] {
  const rows = db.prepare('SELECT name FROM tags WHERE material_id = ? ORDER BY name').all(materialId) as any[];
  return rows.map(r => r.name);
}

function getTagsForMaterials(materialIds: string[]): Map<string, string[]> {
  const tagsMap = new Map<string, string[]>();
  if (materialIds.length === 0) return tagsMap;

  const placeholders = materialIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT material_id, name FROM tags WHERE material_id IN (${placeholders}) ORDER BY name`).all(...materialIds) as any[];

  for (const row of rows) {
    if (!tagsMap.has(row.material_id)) {
      tagsMap.set(row.material_id, []);
    }
    tagsMap.get(row.material_id)!.push(row.name);
  }

  return tagsMap;
}

function isEmpty(): boolean {
  const materialsCount = db.prepare('SELECT COUNT(*) as count FROM materials').get() as any;
  const boardsCount = db.prepare('SELECT COUNT(*) as count FROM boards').get() as any;
  return materialsCount.count === 0 && boardsCount.count === 0;
}

export function getMaterials(
  page: number = 1,
  limit: number = 20,
  keyword?: string,
  tag?: string
): { materials: Material[]; total: number; hasMore: boolean } {
  const offset = (page - 1) * limit;
  let whereClauses: string[] = [];
  let params: any[] = [];

  if (keyword) {
    whereClauses.push('m.title LIKE ?');
    params.push(`%${keyword}%`);
  }

  if (tag) {
    whereClauses.push('m.id IN (SELECT material_id FROM tags WHERE name = ?)');
    params.push(tag);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(DISTINCT m.id) as count FROM materials m ${whereSql}`;
  const total = (db.prepare(countSql).get(...params) as any).count;

  const sql = `
    SELECT DISTINCT m.* FROM materials m
    ${whereSql}
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as any[];
  const materialIds = rows.map(r => r.id);
  const tagsMap = getTagsForMaterials(materialIds);

  const materials = rows.map(row => rowToMaterial(row, tagsMap.get(row.id) || []));
  const hasMore = offset + rows.length < total;

  return { materials, total, hasMore };
}

export function getMaterial(id: string): Material | null {
  const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as any;
  if (!row) return null;
  const tags = getTagsForMaterial(id);
  return rowToMaterial(row, tags);
}

export function createMaterial(data: {
  id?: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  tags?: string[];
}): Material {
  const id = data.id || uuidv4();
  const tags = data.tags || [];

  const insertMaterial = db.prepare(`
    INSERT INTO materials (id, title, type, url, thumbnail_url, favorited)
    VALUES (?, ?, ?, ?, ?, 0)
  `);
  insertMaterial.run(id, data.title, data.type, data.url, data.thumbnail_url || null);

  const insertTag = db.prepare('INSERT INTO tags (id, name, material_id) VALUES (?, ?, ?)');
  for (const tag of tags) {
    insertTag.run(uuidv4(), tag, id);
  }

  const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as any;
  return rowToMaterial(row, tags);
}

export function updateMaterial(
  id: string,
  data: {
    title?: string;
    favorited?: boolean;
    tags?: string[];
  }
): Material | null {
  const existing = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as any;
  if (!existing) return null;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    params.push(data.title);
  }

  if (data.favorited !== undefined) {
    updates.push('favorited = ?');
    params.push(data.favorited ? 1 : 0);
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE materials SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  if (data.tags !== undefined) {
    db.prepare('DELETE FROM tags WHERE material_id = ?').run(id);
    const insertTag = db.prepare('INSERT INTO tags (id, name, material_id) VALUES (?, ?, ?)');
    for (const tag of data.tags) {
      insertTag.run(uuidv4(), tag, id);
    }
  }

  return getMaterial(id);
}

export function deleteMaterial(id: string): boolean {
  const result = db.prepare('DELETE FROM materials WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getBoards(): Board[] {
  const rows = db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all() as any[];
  return rows.map(rowToBoard);
}

export function getBoard(id: string): BoardWithMaterials | null {
  const row = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as any;
  if (!row) return null;

  const materials = getBoardMaterials(id);
  return { ...rowToBoard(row), materials };
}

export function createBoard(data: { id?: string; title: string }): Board {
  const id = data.id || uuidv4();
  db.prepare('INSERT INTO boards (id, title, layout) VALUES (?, ?, ?)').run(id, data.title, '[]');
  const row = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as any;
  return rowToBoard(row);
}

export function updateBoard(
  id: string,
  data: {
    title?: string;
    layout?: string;
  }
): Board | null {
  const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as any;
  if (!existing) return null;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    params.push(data.title);
  }

  if (data.layout !== undefined) {
    updates.push('layout = ?');
    params.push(data.layout);
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE boards SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const row = db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as any;
  return rowToBoard(row);
}

export function deleteBoard(id: string): boolean {
  const result = db.prepare('DELETE FROM boards WHERE id = ?').run(id);
  return result.changes > 0;
}

export function addMaterialsToBoard(
  boardId: string,
  materialIds: string[]
): { success: boolean; added: number } {
  const board = db.prepare('SELECT 1 FROM boards WHERE id = ?').get(boardId);
  if (!board) return { success: false, added: 0 };

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO board_materials (board_id, material_id, added_at)
    VALUES (?, ?, datetime('now'))
  `);

  let added = 0;
  const transaction = db.transaction(() => {
    for (const materialId of materialIds) {
      const result = insertStmt.run(boardId, materialId);
      added += result.changes;
    }
  });

  transaction();
  return { success: true, added };
}

export function removeMaterialFromBoard(boardId: string, materialId: string): boolean {
  const result = db.prepare('DELETE FROM board_materials WHERE board_id = ? AND material_id = ?').run(boardId, materialId);
  return result.changes > 0;
}

export function getBoardMaterials(boardId: string): Material[] {
  const sql = `
    SELECT m.* FROM materials m
    INNER JOIN board_materials bm ON m.id = bm.material_id
    WHERE bm.board_id = ?
    ORDER BY bm.added_at DESC
  `;
  const rows = db.prepare(sql).all(boardId) as any[];
  const materialIds = rows.map(r => r.id);
  const tagsMap = getTagsForMaterials(materialIds);

  return rows.map(row => rowToMaterial(row, tagsMap.get(row.id) || []));
}

export function getAllTags(): string[] {
  const rows = db.prepare('SELECT DISTINCT name FROM tags ORDER BY name').all() as any[];
  return rows.map(r => r.name);
}

export function getMaterialTags(materialId: string): string[] {
  return getTagsForMaterial(materialId);
}

export function addTagToMaterial(materialId: string, tagName: string): void {
  const existing = db.prepare('SELECT 1 FROM tags WHERE material_id = ? AND name = ?').get(materialId, tagName);
  if (!existing) {
    db.prepare('INSERT INTO tags (id, name, material_id) VALUES (?, ?, ?)').run(uuidv4(), tagName, materialId);
  }
}

export function removeTagFromMaterial(materialId: string, tagName: string): void {
  db.prepare('DELETE FROM tags WHERE material_id = ? AND name = ?').run(materialId, tagName);
}

function initTestData() {
  const tagGroups = [
    ['nature', 'landscape', 'photo'],
    ['city', 'architecture', 'urban'],
    ['portrait', 'people', 'face'],
    ['abstract', 'art', 'creative'],
    ['food', 'cooking', 'delicious'],
    ['travel', 'adventure', 'explore'],
  ];

  const materialTitles = [
    '山川湖海',
    '城市夜景',
    '人物特写',
    '抽象艺术',
    '美食摄影',
    '旅行日记',
    '森林探险',
    '建筑之美',
    '街头抓拍',
    '色彩实验',
    '烘焙时光',
    '远方的诗',
  ];

  const materials: Material[] = [];
  for (let i = 0; i < 12; i++) {
    const type: 'image' | 'video' = i % 2 === 0 ? 'image' : 'video';
    const tags = tagGroups[i % tagGroups.length];
    const material = createMaterial({
      id: `mat-${i + 1}`,
      title: materialTitles[i],
      type,
      url: `https://picsum.photos/800/600?random=${i + 1}`,
      thumbnail_url: `https://picsum.photos/400/300?random=${i + 1}`,
      tags,
    });
    materials.push(material);
  }

  const boardTitles = ['灵感收集', '设计参考', '项目素材'];
  for (let i = 0; i < 3; i++) {
    const board = createBoard({
      id: `board-${i + 1}`,
      title: boardTitles[i],
    });

    const startIdx = i * 4;
    const endIdx = startIdx + 4;
    const boardMaterialIds = materials.slice(startIdx, endIdx).map(m => m.id);
    addMaterialsToBoard(board.id, boardMaterialIds);
  }

  console.log('初始化测试数据完成：3个看板，12个素材');
}

initTables();

if (isEmpty()) {
  initTestData();
}

export { db };
