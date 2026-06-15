import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '..', '..', 'grocery.db')

export const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT '个',
    expiry_date TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
  CREATE INDEX IF NOT EXISTS idx_items_quantity ON items(quantity);

  CREATE TABLE IF NOT EXISTS shopping_list (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT '个',
    checked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_shopping_item_id ON shopping_list(item_id);
  CREATE INDEX IF NOT EXISTS idx_shopping_checked ON shopping_list(checked);
`)

const seedStmt = db.prepare(`
  INSERT OR IGNORE INTO items (id, name, quantity, unit, expiry_date, created_at)
  VALUES (@id, @name, @quantity, @unit, @expiry_date, @created_at)
`)

const seedTransaction = db.transaction((items: Array<{ id: string; name: string; quantity: number; unit: string; expiry_date: string; created_at: number }>) => {
  for (const item of items) seedStmt.run(item)
})

seedTransaction([
  { id: 'seed-1', name: '牛奶', quantity: 3, unit: '盒', expiry_date: '2026-06-15', created_at: 1718000000000 },
  { id: 'seed-2', name: '鸡蛋', quantity: 6, unit: '个', expiry_date: '2026-06-20', created_at: 1718000000001 },
  { id: 'seed-3', name: '面包', quantity: 1, unit: '袋', expiry_date: '2026-06-13', created_at: 1718000000002 },
  { id: 'seed-4', name: '苹果', quantity: 8, unit: '个', expiry_date: '2026-06-18', created_at: 1718000000003 },
])

export interface InventoryItemRow {
  id: string
  name: string
  quantity: number
  unit: string
  expiry_date: string | null
  created_at: number
}

export interface ShoppingListRow {
  id: string
  item_id: string
  name: string
  quantity: number
  unit: string
  checked: number
  created_at: number
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

export function rowToShoppingItem(row: ShoppingListRow & { current_stock?: number }) {
  return {
    id: row.id,
    itemId: row.item_id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    checked: row.checked === 1,
    currentStock: row.current_stock ?? 0,
    createdAt: row.created_at,
  }
}
