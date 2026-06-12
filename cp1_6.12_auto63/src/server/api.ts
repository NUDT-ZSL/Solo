import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { getDb, saveDb, rowsToItems, rowToItem, InventoryItemRow } from './database.js'

const app = express()
const PORT = 3000
const LOW_STOCK_THRESHOLD = 2

app.use(cors())
app.use(express.json())

app.get('/api/items', async (_req, res) => {
  const db = await getDb()
  const result = db.exec('SELECT * FROM items ORDER BY created_at DESC')
  const rows = result[0]?.values ?? []
  res.json(rowsToItems(rows).map(rowToItem))
})

app.post('/api/items', async (req, res) => {
  const db = await getDb()
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
  const existingResult = db.exec('SELECT * FROM items WHERE name = ?', [trimmedName])
  const existingRows = existingResult[0]?.values ?? []
  const existing = existingRows.length > 0 ? (rowsToItems(existingRows)[0] as InventoryItemRow) : null

  if (existing) {
    const finalUnit = unit ?? existing.unit
    const finalExpiry = expiryDate ?? existing.expiry_date
    db.run(
      'UPDATE items SET quantity = quantity + ?, unit = ?, expiry_date = ? WHERE id = ?',
      [quantity, finalUnit, finalExpiry ?? null, existing.id]
    )
    saveDb()
    const updatedResult = db.exec('SELECT * FROM items WHERE id = ?', [existing.id])
    const updated = rowsToItems(updatedResult[0].values)[0]
    res.json(rowToItem(updated))
    return
  }

  const id = uuidv4()
  const createdAt = Date.now()
  db.run(
    'INSERT INTO items (id, name, quantity, unit, expiry_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, trimmedName, quantity, unit ?? '个', expiryDate ?? null, createdAt]
  )
  saveDb()

  const rowResult = db.exec('SELECT * FROM items WHERE id = ?', [id])
  const row = rowsToItems(rowResult[0].values)[0]
  res.json(rowToItem(row))
})

app.delete('/api/items/:id', async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  const before = db.exec('SELECT * FROM items WHERE id = ?', [id])
  if (!before[0]?.values?.length) {
    res.status(404).json({ error: 'Item not found' })
    return
  }
  db.run('DELETE FROM items WHERE id = ?', [id])
  saveDb()
  res.json({ success: true })
})

app.patch('/api/items/:id/increment', async (req, res) => {
  const db = await getDb()
  const { id } = req.params
  const before = db.exec('SELECT * FROM items WHERE id = ?', [id])
  if (!before[0]?.values?.length) {
    res.status(404).json({ error: 'Item not found' })
    return
  }
  db.run('UPDATE items SET quantity = quantity + 1 WHERE id = ?', [id])
  saveDb()
  const rowResult = db.exec('SELECT * FROM items WHERE id = ?', [id])
  const row = rowsToItems(rowResult[0].values)[0]
  res.json(rowToItem(row))
})

app.get('/api/shopping-list', async (_req, res) => {
  const db = await getDb()
  const result = db.exec('SELECT * FROM items WHERE quantity < ? ORDER BY quantity ASC', [LOW_STOCK_THRESHOLD])
  const rows = rowsToItems(result[0]?.values ?? [])
  res.json(rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: LOW_STOCK_THRESHOLD - row.quantity + 1,
    unit: row.unit,
    currentStock: row.quantity,
  })))
})

async function start() {
  await getDb()
  app.listen(PORT, () => {
    console.log(`GroceryCollab API server running on http://localhost:${PORT}`)
  })
}

start()
