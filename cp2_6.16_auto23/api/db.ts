import initSqlite, { type Database } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '..', 'mood.db')

let db: Database | null = null

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlite()

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS mood_records (
      id TEXT PRIMARY KEY,
      mood TEXT NOT NULL CHECK(mood IN ('happy', 'calm', 'neutral', 'down', 'anxious')),
      text TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_mood_records_createdAt ON mood_records(createdAt)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_mood_records_mood ON mood_records(mood)`)

  saveDb()
  return db
}

export function saveDb(): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}
