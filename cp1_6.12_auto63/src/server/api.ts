import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { db, rowToItem, rowToShoppingItem, InventoryItemRow, ShoppingListRow } from './database.js'

const app = express()
const PORT = 3000
const LOW_STOCK_THRESHOLD = 2

app.use(cors())
app.use(express.json())

app.get('/api/items', (_req, res) => {
  const rows = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all() as InventoryItemRow[]
  res.json(rows.map(rowToItem))
})

app.post('/api/items', (req, res) => {
  const { name, quantity, unit, expiryDate } = req.body as {
    name: string
    quantity: number
    unit?: string
    expiryDate?: string
  }

  if (!name || typeof quantity !== 'number') {
    res.status(400).json({ error: 'name and quantity are required' })
    return
  }

  const trimmedName = name.trim()
  const existing = db.prepare('SELECT * FROM items WHERE name = ?').get(trimmedName) as InventoryItemRow | undefined

  if (existing) {
    db.prepare('UPDATE items SET quantity = quantity + ?, unit = COALESCE(?, unit), expiry_date = COALESCE(?, expiry_date) WHERE id = ?')
      .run(quantity, unit ?? null, expiryDate ?? null, existing.id)

    const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(existing.id) as InventoryItemRow
    syncShoppingListForItem(updated.id)
    res.json(rowToItem(updated))
    return
  }

  const id = uuidv4()
  const createdAt = Date.now()
  db.prepare(`
    INSERT INTO items (id, name, quantity, unit, expiry_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, trimmedName, quantity, unit ?? '个', expiryDate ?? null, createdAt)

  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as InventoryItemRow
  syncShoppingListForItem(id)
  res.json(rowToItem(row))
})

app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params
  const result = db.prepare('DELETE FROM items WHERE id = ?').run(id)
  if (result.changes === 0) {
    res.status(404).json({ error: 'Item not found' })
    return
  }
  db.prepare('DELETE FROM shopping_list WHERE item_id = ?').run(id)
  res.json({ success: true })
})

app.patch('/api/items/:id/increment', (req, res) => {
  const { id } = req.params
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as InventoryItemRow | undefined
  if (!item) {
    res.status(404).json({ error: 'Item not found' })
    return
  }
  db.prepare('UPDATE items SET quantity = quantity + 1 WHERE id = ?').run(id)
  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as InventoryItemRow
  syncShoppingListForItem(id)
  res.json(rowToItem(updated))
})

function syncShoppingListForItem(itemId: string) {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as InventoryItemRow | undefined
  if (!item) return

  const existing = db.prepare('SELECT * FROM shopping_list WHERE item_id = ?').get(itemId) as ShoppingListRow | undefined

  if (item.quantity < LOW_STOCK_THRESHOLD) {
    const neededQty = LOW_STOCK_THRESHOLD - item.quantity + 1
    if (existing) {
      db.prepare('UPDATE shopping_list SET name = ?, quantity = ?, unit = ?, checked = 0 WHERE item_id = ?')
        .run(item.name, neededQty, item.unit, itemId)
    } else {
      const id = uuidv4()
      db.prepare(`
        INSERT INTO shopping_list (id, item_id, name, quantity, unit, checked, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `).run(id, itemId, item.name, neededQty, item.unit, Date.now())
    }
  } else {
    if (existing) {
      db.prepare('DELETE FROM shopping_list WHERE item_id = ?').run(itemId)
    }
  }
}

function regenerateShoppingList() {
  const allItems = db.prepare('SELECT * FROM items').all() as InventoryItemRow[]
  for (const item of allItems) {
    syncShoppingListForItem(item.id)
  }
}

app.get('/api/shopping-list', (_req, res) => {
  regenerateShoppingList()
  const rows = db.prepare(`
    SELECT sl.*, i.quantity as current_stock
    FROM shopping_list sl
    LEFT JOIN items i ON sl.item_id = i.id
    ORDER BY sl.checked ASC, sl.created_at DESC
  `).all() as Array<ShoppingListRow & { current_stock: number }>
  res.json(rows.map(rowToShoppingItem))
})

app.patch('/api/shopping-list/:id/check', (req, res) => {
  const { id } = req.params
  const listItem = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(id) as ShoppingListRow | undefined
  if (!listItem) {
    res.status(404).json({ error: 'Shopping list item not found' })
    return
  }

  db.prepare('UPDATE items SET quantity = quantity + 1 WHERE id = ?').run(listItem.item_id)
  db.prepare('UPDATE shopping_list SET checked = 1 WHERE id = ?').run(id)

  const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(listItem.item_id) as InventoryItemRow | undefined
  if (updatedItem && updatedItem.quantity >= LOW_STOCK_THRESHOLD) {
    db.prepare('DELETE FROM shopping_list WHERE id = ?').run(id)
  }

  const row = db.prepare(`
    SELECT sl.*, i.quantity as current_stock
    FROM shopping_list sl
    LEFT JOIN items i ON sl.item_id = i.id
    WHERE sl.id = ?
  `).get(id) as (ShoppingListRow & { current_stock: number }) | undefined

  if (!row) {
    res.json({ removed: true })
    return
  }
  res.json(rowToShoppingItem(row))
})

app.listen(PORT, () => {
  console.log(`GroceryCollab API server running on http://localhost:${PORT}`)
})
