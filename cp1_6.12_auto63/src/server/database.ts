import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '..', '..', 'grocery.db')

let db: Database | null = null

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      quantity INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '个',
      expiry_date TEXT,
      created_at INTEGER NOT NULL
    )
  `)

  const existingCheck = db.exec('SELECT COUNT(*) as cnt FROM items')
  const count = existingCheck[0]?.values[0]?.[0] as number | undefined

  if (!count || count === 0) {
    const seedData = [
      { id: 'seed-1', name: '牛奶', quantity: 3, unit: '盒', expiry_date: '2026-06-15', created_at: 1718000000000 },
      { id: 'seed-2', name: '鸡蛋', quantity: 6, unit: '个', expiry_date: '2026-06-20', created_at: 1718000000001 },
      { id: 'seed-3', name: '面包', quantity: 1, unit: '袋', expiry_date: '2026-06-13', created_at: 1718000000002 },
      { id: 'seed-4', name: '苹果', quantity: 8, unit: '个', expiry_date: '2026-06-18', created_at: 1718000000003 },
    ]
    const stmt = db.prepare(
      'INSERT INTO items (id, name, quantity, unit, expiry_date, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const s of seedData) {
      stmt.run([s.id, s.name, s.quantity, s.unit, s.expiry_date, s.created_at])
    }
    stmt.free()
    saveDb()
  }

  return db
}

export function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

export interface InventoryItemRow {
  id: string
  name: string
  quantity: number
  unit: string
  expiry_date: string | null
  created_at: number
}

export function rowsToItems(rows: any[][]): InventoryItemRow[] {
  return rows.map((r) => ({
    id: String(r[0]),
    name: String(r[1]),
    quantity: Number(r[2]),
    unit: String(r[3]),
    expiry_date: r[4] ? String(r[4]) : null,
    created_at: Number(r[5]),
  }))
}

export function rowToItem(row: InventoryItemRow) {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    expiryDate: row.expiry_date ?? '',
    createdAt: row.created_at,
  }
}
