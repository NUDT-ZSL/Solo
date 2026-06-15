import Database from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '..', 'mood.db')

const db = new Database.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message)
  } else {
    console.log('Database opened successfully')
    initDb()
  }
})

function initDb(): void {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS mood_records (
        id TEXT PRIMARY KEY,
        mood TEXT NOT NULL CHECK(mood IN ('happy', 'calm', 'neutral', 'down', 'anxious')),
        text TEXT DEFAULT '',
        createdAt TEXT NOT NULL
      )
    `, (err) => {
      if (err) console.error('Create table error:', err.message)
    })
    db.run(`CREATE INDEX IF NOT EXISTS idx_mood_records_createdAt ON mood_records(createdAt)`)
    db.run(`CREATE INDEX IF NOT EXISTS idx_mood_records_mood ON mood_records(mood)`)
  })
}

export function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err: Error | null) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: T) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

export function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

export default db
