import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import type { GalleryLayout, LayoutElement, Artwork, Invitation } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'gallery.db');

let db: SqlJsDatabase | null = null;

const saveToDisk = () => {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
};

const initDatabase = async () => {
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file);
      if (fs.existsSync(wasmPath)) return wasmPath;
      return file;
    },
  });

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('Loaded existing SQLite database from disk');
  } else {
    db = new SQL.Database();
    console.log('Created new SQLite database in memory');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS gallery_layout (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Main Gallery',
      width INTEGER NOT NULL DEFAULT 600,
      height INTEGER NOT NULL DEFAULT 400,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS wall (
      id TEXT PRIMARY KEY,
      layout_id TEXT NOT NULL,
      x INTEGER NOT NULL DEFAULT 0,
      y INTEGER NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 100,
      height INTEGER NOT NULL DEFAULT 10,
      FOREIGN KEY (layout_id) REFERENCES gallery_layout(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS stand (
      id TEXT PRIMARY KEY,
      layout_id TEXT NOT NULL,
      x INTEGER NOT NULL DEFAULT 0,
      y INTEGER NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 30,
      height INTEGER NOT NULL DEFAULT 30,
      artwork_id TEXT,
      artwork_color TEXT,
      artwork_name TEXT,
      FOREIGN KEY (layout_id) REFERENCES gallery_layout(id) ON DELETE CASCADE,
      FOREIGN KEY (artwork_id) REFERENCES artwork(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS artwork (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      tags_json TEXT DEFAULT '[]',
      original_url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      average_color TEXT DEFAULT '#6c63ff',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS invitation (
      id TEXT PRIMARY KEY,
      layout_id TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (layout_id) REFERENCES gallery_layout(id)
    );
  `);

  const existing = db.exec('SELECT id FROM gallery_layout WHERE id = ?', ['default']);
  if (existing.length === 0 || existing[0].values.length === 0) {
    db.run(
      `INSERT INTO gallery_layout (id, name, width, height) VALUES (?, ?, ?, ?)`,
      ['default', 'Main Gallery', 600, 400]
    );
  }
  saveToDisk();
};

const dbReady = initDatabase()
  .then(() => console.log('Database initialized successfully'))
  .catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

const waitForDb = async () => {
  await dbReady;
  if (!db) throw new Error('Database not initialized');
  return db;
};

const queryRows = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  const database = await waitForDb();
  const results = database.exec(sql, params);
  if (results.length === 0) return [];
  const columns = results[0].columns;
  return results[0].values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, idx: number) => { obj[col] = row[idx]; });
    return obj as T;
  });
};

const queryOne = async <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
  const rows = await queryRows<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

export const getLayout = async (): Promise<GalleryLayout> => {
  const layoutRow: any = await queryOne('SELECT * FROM gallery_layout WHERE id = ?', ['default']);
  if (!layoutRow) throw new Error('Layout not found');

  const walls: any[] = await queryRows('SELECT * FROM wall WHERE layout_id = ?', [layoutRow.id]);
  const stands: any[] = await queryRows('SELECT * FROM stand WHERE layout_id = ?', [layoutRow.id]);

  const elements: LayoutElement[] = [
    ...walls.map((w) => ({
      id: w.id, type: 'wall' as const, x: w.x, y: w.y, width: w.width, height: w.height,
    })),
    ...stands.map((s) => ({
      id: s.id, type: 'stand' as const, x: s.x, y: s.y, width: s.width, height: s.height,
      artworkId: s.artwork_id || undefined,
      artworkColor: s.artwork_color || undefined,
      artworkName: s.artwork_name || undefined,
    })),
  ];

  return {
    id: layoutRow.id, name: layoutRow.name,
    width: layoutRow.width, height: layoutRow.height,
    elements, updatedAt: layoutRow.updated_at,
  };
};

export const updateLayout = async (id: string, elements: LayoutElement[]): Promise<GalleryLayout> => {
  const database = await waitForDb();

  try {
    database.run('BEGIN TRANSACTION');
    database.run('DELETE FROM wall WHERE layout_id = ?', [id]);
    database.run('DELETE FROM stand WHERE layout_id = ?', [id]);

    const walls = elements.filter((el) => el.type === 'wall');
    const stands = elements.filter((el) => el.type === 'stand');

    for (const w of walls) {
      database.run(
        'INSERT INTO wall (id, layout_id, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)',
        [w.id, id, w.x, w.y, w.width, w.height]
      );
    }

    for (const s of stands) {
      database.run(
        'INSERT INTO stand (id, layout_id, x, y, width, height, artwork_id, artwork_color, artwork_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, id, s.x, s.y, s.width, s.height, s.artworkId || null, s.artworkColor || null, s.artworkName || null]
      );
    }

    database.run('UPDATE gallery_layout SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    database.run('COMMIT');
  } catch (err) {
    try { database.run('ROLLBACK'); } catch { /* ignore rollback errors */ }
    throw err;
  }

  saveToDisk();
  return getLayout();
};

export const updateStandArtwork = async (
  standId: string, artworkId: string | null, artworkColor: string | null, artworkName: string | null,
  layoutId: string = 'default'
): Promise<void> => {
  const database = await waitForDb();
  database.run(
    'UPDATE stand SET artwork_id = ?, artwork_color = ?, artwork_name = ? WHERE id = ?',
    [artworkId, artworkColor, artworkName, standId]
  );
  database.run('UPDATE gallery_layout SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [layoutId]);
  saveToDisk();
};

export const getArtworks = async (): Promise<Artwork[]> => {
  const rows: any[] = await queryRows('SELECT * FROM artwork ORDER BY uploaded_at DESC');
  return rows.map((row) => ({
    id: row.id, name: row.name, description: row.description,
    tags: JSON.parse(row.tags_json || '[]'),
    originalUrl: row.original_url, thumbnailUrl: row.thumbnail_url,
    averageColor: row.average_color, uploadedAt: row.uploaded_at,
  }));
};

export const addArtwork = async (artwork: Omit<Artwork, 'uploadedAt'>): Promise<Artwork> => {
  const database = await waitForDb();
  database.run(
    `INSERT INTO artwork (id, name, description, tags_json, original_url, thumbnail_url, average_color) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [artwork.id, artwork.name, artwork.description, JSON.stringify(artwork.tags), artwork.originalUrl, artwork.thumbnailUrl, artwork.averageColor]
  );
  saveToDisk();

  const row: any = await queryOne('SELECT * FROM artwork WHERE id = ?', [artwork.id]);
  return {
    id: row.id, name: row.name, description: row.description,
    tags: JSON.parse(row.tags_json || '[]'),
    originalUrl: row.original_url, thumbnailUrl: row.thumbnail_url,
    averageColor: row.average_color, uploadedAt: row.uploaded_at,
  };
};

export const addInvitation = async (
  invitation: Omit<Invitation, 'createdAt'> & { layoutId?: string }
): Promise<Invitation> => {
  const database = await waitForDb();
  database.run(
    `INSERT INTO invitation (id, layout_id, email, status) VALUES (?, ?, ?, ?)`,
    [invitation.id, invitation.layoutId || 'default', invitation.email, invitation.status]
  );
  saveToDisk();

  const row: any = await queryOne('SELECT * FROM invitation WHERE id = ?', [invitation.id]);
  return {
    id: row.id, email: row.email,
    status: row.status as 'pending' | 'accepted',
    createdAt: row.created_at,
  };
};

export { waitForDb };
export default db;
