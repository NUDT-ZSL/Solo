import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'game.db')

let db: Database.Database | null = null

export const initDB = (): void => {
  db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      score INTEGER NOT NULL,
      seed TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  console.log('Database initialized at', dbPath)
}

export const insertScore = (score: number, seed: string): { success: boolean } => {
  if (!db) {
    throw new Error('Database not initialized')
  }

  const stmt = db.prepare('INSERT INTO scores (score, seed) VALUES (?, ?)')
  stmt.run(score, seed)
  return { success: true }
}

export const getHighScore = (): number => {
  if (!db) {
    throw new Error('Database not initialized')
  }

  const row = db.prepare('SELECT MAX(score) as maxScore FROM scores').get() as { maxScore: number } | null
  return row?.maxScore || 0
}

export const closeDB = (): void => {
  if (db) {
    db.close()
    db = null
  }
}
