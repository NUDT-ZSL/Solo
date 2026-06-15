import initSqlJs, { type Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database | null = null;
const DB_PATH = path.join(__dirname, '..', 'data', 'trails.db');

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS trails (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      userId TEXT NOT NULL,
      geojson TEXT NOT NULL,
      thumbnailUrl TEXT DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      trailId TEXT NOT NULL,
      imagePath TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      trailId TEXT NOT NULL,
      userId TEXT NOT NULL
    )
  `);

  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buffer);
}

export function getAllTrails(
  search?: string,
  sort?: string,
  order?: string,
  userId?: string,
): any[] {
  if (!db) return [];

  let sql = `
    SELECT t.*, COUNT(f.id) as favoriteCount
    FROM trails t
    LEFT JOIN favorites f ON t.id = f.trailId
  `;

  const conditions: string[] = [];
  if (search) {
    conditions.push(`t.title LIKE '%${search.replace(/'/g, "''")}%'`);
  }
  if (userId) {
    conditions.push(`t.userId = '${userId.replace(/'/g, "''")}'`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  sql += ` GROUP BY t.id`;

  const sortField = sort || 'createdAt';
  const orderDir = order === 'asc' ? 'ASC' : 'DESC';

  if (sortField === 'favoriteCount') {
    sql += ` ORDER BY favoriteCount ${orderDir}`;
  } else if (sortField === 'distance') {
    sql += ` ORDER BY (
      SELECT json_extract(value, '$[0]') FROM json_each(json_extract(t.geojson, '$.features[0].geometry.coordinates[0]'))
    ) ${orderDir}`;
  } else {
    sql += ` ORDER BY t.createdAt ${orderDir}`;
  }

  const results = db.exec(sql);
  if (results.length === 0) return [];

  const columns = results[0].columns;
  return results[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export function getTrailById(id: string): any | null {
  if (!db) return null;

  const results = db.exec(
    `SELECT * FROM trails WHERE id = '${id.replace(/'/g, "''")}'`,
  );
  if (results.length === 0 || results[0].values.length === 0) return null;

  const columns = results[0].columns;
  const row = results[0].values[0];
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj;
}

export function createTrail(
  id: string,
  title: string,
  description: string,
  userId: string,
  geojson: string,
): void {
  if (!db) return;

  db.run(
    `INSERT INTO trails (id, title, description, userId, geojson) VALUES (?, ?, ?, ?, ?)`,
    [id, title, description, userId, geojson],
  );
  saveDb();
}

export function updateTrail(
  id: string,
  title?: string,
  description?: string,
): void {
  if (!db) return;

  const sets: string[] = [];
  const params: any[] = [];

  if (title !== undefined) {
    sets.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    sets.push('description = ?');
    params.push(description);
  }

  if (sets.length === 0) return;

  params.push(id);
  db.run(`UPDATE trails SET ${sets.join(', ')} WHERE id = ?`, params);
  saveDb();
}

export function deleteTrail(id: string): void {
  if (!db) return;

  db.run(`DELETE FROM favorites WHERE trailId = ?`, [id]);
  db.run(`DELETE FROM photos WHERE trailId = ?`, [id]);
  db.run(`DELETE FROM trails WHERE id = ?`, [id]);
  saveDb();
}

export function getPhotosByTrailId(trailId: string): any[] {
  if (!db) return [];

  const results = db.exec(
    `SELECT * FROM photos WHERE trailId = '${trailId.replace(/'/g, "''")}'`,
  );
  if (results.length === 0) return [];

  const columns = results[0].columns;
  return results[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export function addPhoto(id: string, trailId: string, imagePath: string): void {
  if (!db) return;

  db.run(
    `INSERT INTO photos (id, trailId, imagePath) VALUES (?, ?, ?)`,
    [id, trailId, imagePath],
  );
  saveDb();
}

export function deletePhotosByTrailId(trailId: string): any[] {
  if (!db) return [];

  const photos = getPhotosByTrailId(trailId);
  db.run(`DELETE FROM photos WHERE trailId = ?`, [trailId]);
  saveDb();
  return photos;
}

export function getFavoriteCount(trailId: string): number {
  if (!db) return 0;

  const results = db.exec(
    `SELECT COUNT(*) as count FROM favorites WHERE trailId = '${trailId.replace(/'/g, "''")}'`,
  );
  if (results.length === 0 || results[0].values.length === 0) return 0;
  return results[0].values[0][0] as number;
}

export function isFavorited(trailId: string, userId: string): boolean {
  if (!db) return false;

  const results = db.exec(
    `SELECT COUNT(*) as count FROM favorites WHERE trailId = '${trailId.replace(/'/g, "''")}' AND userId = '${userId.replace(/'/g, "''")}'`,
  );
  if (results.length === 0 || results[0].values.length === 0) return false;
  return (results[0].values[0][0] as number) > 0;
}

export function toggleFavorite(
  id: string,
  trailId: string,
  userId: string,
): { isFavorited: boolean; favoriteCount: number } {
  if (!db) return { isFavorited: false, favoriteCount: 0 };

  const currentlyFavorited = isFavorited(trailId, userId);

  if (currentlyFavorited) {
    db.run(`DELETE FROM favorites WHERE trailId = ? AND userId = ?`, [
      trailId,
      userId,
    ]);
  } else {
    db.run(
      `INSERT INTO favorites (id, trailId, userId) VALUES (?, ?, ?)`,
      [id, trailId, userId],
    );
  }

  saveDb();

  const favoriteCount = getFavoriteCount(trailId);
  return { isFavorited: !currentlyFavorited, favoriteCount };
}
