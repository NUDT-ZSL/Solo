import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'outfit.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const initDb = () => {
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      outfit_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (outfit_id) REFERENCES outfits(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_outfits_created_at ON outfits(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_likes_outfit_id ON likes(outfit_id);
    CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_outfit_user ON likes(outfit_id, user_id);
  `)
}

initDb()

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
  const stmt = db.prepare(`
    INSERT INTO outfits (
      id, name, top_style, top_color, bottom_style, bottom_color,
      shoes_style, shoes_color, accessory_style, accessory_color, thumbnail
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    id,
    name,
    topStyle,
    topColor,
    bottomStyle,
    bottomColor,
    shoesStyle,
    shoesColor,
    accessoryStyle,
    accessoryColor,
    thumbnail
  )
  return getOutfitById(id)!
}

export const getOutfitById = (id: string): OutfitRecord | undefined => {
  const stmt = db.prepare('SELECT * FROM outfits WHERE id = ?')
  return stmt.get(id) as OutfitRecord | undefined
}

export const getOutfits = (limit: number = 20): OutfitRecord[] => {
  const stmt = db.prepare('SELECT * FROM outfits ORDER BY created_at DESC LIMIT ?')
  return stmt.all(limit) as OutfitRecord[]
}

export const getOutfitCount = (): number => {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM outfits')
  const result = stmt.get() as { count: number }
  return result.count
}

export const deleteOutfit = (id: string): boolean => {
  const stmt = db.prepare('DELETE FROM outfits WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}

export const toggleLike = (
  likeId: string,
  outfitId: string,
  userId: string
): { likes: number; isLiked: boolean } => {
  const existingLike = db
    .prepare('SELECT * FROM likes WHERE outfit_id = ? AND user_id = ?')
    .get(outfitId, userId) as LikeRecord | undefined

  if (existingLike) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existingLike.id)
    db.prepare('UPDATE outfits SET likes = likes - 1 WHERE id = ?').run(outfitId)
    const outfit = getOutfitById(outfitId)!
    return { likes: outfit.likes, isLiked: false }
  } else {
    db.prepare('INSERT INTO likes (id, outfit_id, user_id) VALUES (?, ?, ?)').run(
      likeId,
      outfitId,
      userId
    )
    db.prepare('UPDATE outfits SET likes = likes + 1 WHERE id = ?').run(outfitId)
    const outfit = getOutfitById(outfitId)!
    return { likes: outfit.likes, isLiked: true }
  }
}

export const getLikedOutfits = (userId: string): OutfitRecord[] => {
  const stmt = db.prepare(`
    SELECT o.* FROM outfits o
    INNER JOIN likes l ON o.id = l.outfit_id
    WHERE l.user_id = ?
    ORDER BY l.created_at DESC
  `)
  return stmt.all(userId) as OutfitRecord[]
}

export const getLikeCount = (outfitId: string): number => {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM likes WHERE outfit_id = ?')
  const result = stmt.get(outfitId) as { count: number }
  return result.count
}

export default db
