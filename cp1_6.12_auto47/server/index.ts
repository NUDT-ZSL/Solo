import express, { Request, Response } from 'express'
import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

app.use(express.json())

interface Memo {
  id: number
  lng: number
  lat: number
  content: string
  timestamp: number
}

interface MemoInput {
  lng: number
  lat: number
  content: string
  timestamp: number
}

let db: Database

const dbPath = path.join(__dirname, '..', 'geomemo.db')

function saveDatabase() {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (error) {
    console.error('Failed to save database:', error)
  }
}

function getMemosFromQuery(sql: string, params: any[] = []): Memo[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results: Memo[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as Memo)
  }
  stmt.free()
  return results
}

async function initDatabase() {
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  })

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
    console.log('Loaded existing database')
  } else {
    db = new SQL.Database()
    console.log('Created new database')
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `)

  saveDatabase()
}

app.get('/api/memos', (_req: Request, res: Response) => {
  try {
    const memos = getMemosFromQuery('SELECT * FROM memos ORDER BY timestamp DESC')
    res.json(memos)
  } catch (error) {
    console.error('Error fetching memos:', error)
    res.status(500).json({ error: 'Failed to fetch memos' })
  }
})

app.post('/api/memos', (req: Request, res: Response) => {
  try {
    const { lng, lat, content, timestamp } = req.body as MemoInput
    
    if (!lng || !lat || !content || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    if (content.length > 200) {
      return res.status(400).json({ error: 'Content exceeds 200 characters' })
    }

    const stmt = db.prepare(
      'INSERT INTO memos (lng, lat, content, timestamp) VALUES (?, ?, ?, ?)'
    )
    stmt.run([lng, lat, content, timestamp])
    stmt.free()

    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    const newMemo = getMemosFromQuery('SELECT * FROM memos WHERE id = ?', [lastId])[0]
    
    saveDatabase()
    res.status(201).json(newMemo)
  } catch (error) {
    console.error('Error creating memo:', error)
    res.status(500).json({ error: 'Failed to create memo' })
  }
})

app.put('/api/memos/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { content } = req.body as { content: string }
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }
    
    if (content.length > 200) {
      return res.status(400).json({ error: 'Content exceeds 200 characters' })
    }

    const existing = getMemosFromQuery('SELECT * FROM memos WHERE id = ?', [parseInt(id)])
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Memo not found' })
    }

    const stmt = db.prepare('UPDATE memos SET content = ? WHERE id = ?')
    stmt.run([content, parseInt(id)])
    stmt.free()

    const updatedMemo = getMemosFromQuery('SELECT * FROM memos WHERE id = ?', [parseInt(id)])[0]
    
    saveDatabase()
    res.json(updatedMemo)
  } catch (error) {
    console.error('Error updating memo:', error)
    res.status(500).json({ error: 'Failed to update memo' })
  }
})

app.delete('/api/memos/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const existing = getMemosFromQuery('SELECT * FROM memos WHERE id = ?', [parseInt(id)])
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Memo not found' })
    }

    const stmt = db.prepare('DELETE FROM memos WHERE id = ?')
    stmt.run([parseInt(id)])
    stmt.free()

    saveDatabase()
    res.json({ message: 'Memo deleted successfully' })
  } catch (error) {
    console.error('Error deleting memo:', error)
    res.status(500).json({ error: 'Failed to delete memo' })
  }
})

app.get('/api/memos/date', (req: Request, res: Response) => {
  try {
    const { start, end } = req.query as { start?: string; end?: string }
    
    let query = 'SELECT * FROM memos'
    const params: number[] = []
    
    if (start && end) {
      query += ' WHERE timestamp >= ? AND timestamp <= ?'
      params.push(parseInt(start), parseInt(end))
    } else if (start) {
      query += ' WHERE timestamp >= ?'
      params.push(parseInt(start))
    } else if (end) {
      query += ' WHERE timestamp <= ?'
      params.push(parseInt(end))
    }
    
    query += ' ORDER BY timestamp DESC'
    
    const memos = getMemosFromQuery(query, params)
    res.json(memos)
  } catch (error) {
    console.error('Error fetching memos by date:', error)
    res.status(500).json({ error: 'Failed to fetch memos by date' })
  }
})

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`GeoMemo server running on http://localhost:${PORT}`)
  })
}).catch((error) => {
  console.error('Failed to initialize database:', error)
  process.exit(1)
})

export default app
