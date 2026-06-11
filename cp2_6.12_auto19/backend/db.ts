import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'outfit.db')

let db: SqlJsDatabase

function saveDb() {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('Failed to save database:', e)
  }
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS outfits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      top_style TEXT NOT NULL,
      top_color TEXT NOT NULL,
      bottom_style TEXT NOT NULL,
      bottom_color TEXT NOT NULL,
      shoes_style TEXT NOT NULL,
      shoes_color TEXT NOT NULL,
      accessory_style TEXT,
      accessory_color TEXT,
      thumbnail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      likes INTEGER DEFAULT 0
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      outfit_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (outfit_id) REFERENCES outfits(id) ON DELETE CASCADE
    );
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_outfits_created_at ON outfits(created_at DESC);`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_likes_outfit_id ON likes(outfit_id);`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);`)
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_outfit_user ON likes(outfit_id, user_id);`)

  saveDb()
  console.log('Database initialized successfully')
}

export interface OutfitRecord {
  id: string
  name: string
  top_style: string
  top_color: string
  bottom_style: string
  bottom_color: string
  shoes_style: string
  shoes_color: string
  accessory_style: string | null
  accessory_color: string | null
  thumbnail: string | null
  created_at: string
  likes: number
}

export interface LikeRecord {
  id: string
  outfit_id: string
  user_id: string
  created_at: string
}

function queryAll<T>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results: T[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return results
}

function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  const results = queryAll<T>(sql, params)
  return results[0]
}

function run(sql: string, params: any[] = []): void {
  db.run(sql, params)
  saveDb()
}

export const insertOutfit = (
  id: string,
  name: string,
  topStyle: string,
  topColor: string,
  bottomStyle: string,
  bottomColor: string,
  shoesStyle: string,
  shoesColor: string,
  accessoryStyle: string | null,
  accessoryColor: string | null,
  thumbnail: string | null
): OutfitRecord => {
  run(
    `INSERT INTO outfits (
      id, name, top_style, top_color, bottom_style, bottom_color,
      shoes_style, shoes_color, accessory_style, accessory_color, thumbnail
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, topStyle, topColor, bottomStyle, bottomColor, shoesStyle, shoesColor, accessoryStyle, accessoryColor, thumbnail]
  )
  return getOutfitById(id)!
}

export const getOutfitById = (id: string): OutfitRecord | undefined => {
  return queryOne<OutfitRecord>('SELECT * FROM outfits WHERE id = ?', [id])
}

export const getOutfits = (limit: number = 20): OutfitRecord[] => {
  return queryAll<OutfitRecord>('SELECT * FROM outfits ORDER BY created_at DESC LIMIT ?', [limit])
}

export const getOutfitCount = (): number => {
  const result = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM outfits')
  return result?.count || 0
}

export const deleteOutfit = (id: string): boolean => {
  const before = getOutfitById(id)
  if (!before) return false
  run('DELETE FROM likes WHERE outfit_id = ?', [id])
  run('DELETE FROM outfits WHERE id = ?', [id])
  return true
}

export const toggleLike = (
  likeId: string,
  outfitId: string,
  userId: string
): { likes: number; isLiked: boolean } => {
  const existingLike = queryOne<LikeRecord>(
    'SELECT * FROM likes WHERE outfit_id = ? AND user_id = ?',
    [outfitId, userId]
  )

  if (existingLike) {
    run('DELETE FROM likes WHERE id = ?', [(existingLike as any).id || existingLike.id])
    run('UPDATE outfits SET likes = MAX(0, likes - 1) WHERE id = ?', [outfitId])
    const outfit = getOutfitById(outfitId)!
    return { likes: outfit.likes, isLiked: false }
  } else {
    run('INSERT INTO likes (id, outfit_id, user_id) VALUES (?, ?, ?)', [likeId, outfitId, userId])
    run('UPDATE outfits SET likes = likes + 1 WHERE id = ?', [outfitId])
    const outfit = getOutfitById(outfitId)!
    return { likes: outfit.likes, isLiked: true }
  }
}

export const getLikedOutfits = (userId: string): OutfitRecord[] => {
  return queryAll<OutfitRecord>(
    `SELECT o.* FROM outfits o
     INNER JOIN likes l ON o.id = l.outfit_id
     WHERE l.user_id = ?
     ORDER BY l.created_at DESC`,
    [userId]
  )
}

export const getLikeCount = (outfitId: string): number => {
  const result = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM likes WHERE outfit_id = ?', [outfitId])
  return result?.count || 0
}
