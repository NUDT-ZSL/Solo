import express, { Request, Response, NextFunction } from 'express'
import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3199

app.use(express.json())

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }
  res.status(500).json({ error: 'Internal server error' })
})

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

interface UpdateMemoInput {
  content: string
}

interface MemoDateQuery {
  start?: string
  end?: string
}

let db: Database

const dbPath = path.join(__dirname, '..', 'geomemo.db')

const MAX_CONTENT_LENGTH = 200
const LNG_MIN = -180
const LNG_MAX = 180
const LAT_MIN = -90
const LAT_MAX = 90
const TIMESTAMP_MIN = 0
const TIMESTAMP_MAX = 4102444800000

function isValidNumber(value: any): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidInteger(value: any): boolean {
  return isValidNumber(value) && Number.isInteger(value)
}

function isValidLngLat(lng: any, lat: any): { valid: boolean; error?: string } {
  if (!isValidNumber(lng)) {
    return { valid: false, error: 'lng must be a valid number' }
  }
  if (!isValidNumber(lat)) {
    return { valid: false, error: 'lat must be a valid number' }
  }
  if (lng < LNG_MIN || lng > LNG_MAX) {
    return { valid: false, error: 'lng must be between -180 and 180' }
  }
  if (lat < LAT_MIN || lat > LAT_MAX) {
    return { valid: false, error: 'lat must be between -90 and 90' }
  }
  return { valid: true }
}

function saveDatabase(): { success: boolean; error?: string } {
  try {
    if (!db) {
      return { success: false, error: 'Database not initialized' }
    }
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to save database:', message)
    return { success: false, error: message }
  }
}

function getMemosFromQuery(sql: string, params: any[] = []): { data: Memo[]; error?: string } {
  try {
    if (!db) {
      return { data: [], error: 'Database not initialized' }
    }
    const stmt = db.prepare(sql)
    try {
      stmt.bind(params)
    } catch (bindError) {
      stmt.free()
      const message = bindError instanceof Error ? bindError.message : String(bindError)
      return { data: [], error: `Failed to bind parameters: ${message}` }
    }
    const results: Memo[] = []
    try {
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as Memo)
      }
    } catch (stepError) {
      const message = stepError instanceof Error ? stepError.message : String(stepError)
      stmt.free()
      return { data: [], error: `Query execution failed: ${message}` }
    }
    stmt.free()
    return { data: results }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { data: [], error: `Database query failed: ${message}` }
  }
}

async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  })

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath)
      db = new SQL.Database(fileBuffer)
      console.log('Loaded existing database')
    } catch (loadError) {
      console.warn('Failed to load existing database, creating new one:', loadError)
      db = new SQL.Database()
    }
  } else {
    db = new SQL.Database()
    console.log('Created new database')
  }

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS memos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lng REAL NOT NULL,
        lat REAL NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `)
  } catch (createError) {
    console.error('Failed to create table:', createError)
    throw createError
  }

  const saveResult = saveDatabase()
  if (!saveResult.success) {
    console.warn('Initial save failed:', saveResult.error)
  }
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.get('/api/memos', (_req: Request, res: Response) => {
  const result = getMemosFromQuery('SELECT * FROM memos ORDER BY timestamp DESC')
  if (result.error) {
    return res.status(500).json({ error: result.error })
  }
  res.json(result.data)
})

app.post('/api/memos', (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object' })
  }

  const { lng, lat, content, timestamp } = req.body as Partial<MemoInput>

  if (lng === undefined || lng === null) {
    return res.status(400).json({ error: 'Field "lng" is required' })
  }
  if (lat === undefined || lat === null) {
    return res.status(400).json({ error: 'Field "lat" is required' })
  }
  if (content === undefined || content === null) {
    return res.status(400).json({ error: 'Field "content" is required' })
  }
  if (timestamp === undefined || timestamp === null) {
    return res.status(400).json({ error: 'Field "timestamp" is required' })
  }

  const lngNum = Number(lng)
  const latNum = Number(lat)
  const tsNum = Number(timestamp)

  const lngLatCheck = isValidLngLat(lngNum, latNum)
  if (!lngLatCheck.valid) {
    return res.status(400).json({ error: lngLatCheck.error })
  }

  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Field "content" must be a string' })
  }

  const trimmedContent = content.trim()
  if (trimmedContent.length === 0) {
    return res.status(400).json({ error: 'Field "content" cannot be empty or whitespace only' })
  }
  if (trimmedContent.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({
      error: `Field "content" exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
      maxLength: MAX_CONTENT_LENGTH,
      currentLength: trimmedContent.length,
    })
  }

  if (!isValidNumber(tsNum)) {
    return res.status(400).json({ error: 'Field "timestamp" must be a valid number' })
  }
  if (tsNum < TIMESTAMP_MIN || tsNum > TIMESTAMP_MAX) {
    return res.status(400).json({ error: 'Field "timestamp" is out of valid range' })
  }

  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' })
    }

    const stmt = db.prepare(
      'INSERT INTO memos (lng, lat, content, timestamp) VALUES (?, ?, ?, ?)'
    )
    try {
      stmt.run([lngNum, latNum, trimmedContent, tsNum])
    } catch (insertError) {
      const message = insertError instanceof Error ? insertError.message : String(insertError)
      stmt.free()
      return res.status(500).json({ error: `Failed to insert memo: ${message}` })
    }
    stmt.free()

    let lastId: number
    try {
      const execResult = db.exec('SELECT last_insert_rowid() as id')
      if (!execResult || execResult.length === 0 || execResult[0].values.length === 0) {
        return res.status(500).json({ error: 'Failed to retrieve inserted memo id' })
      }
      lastId = execResult[0].values[0][0] as number
    } catch (idError) {
      const message = idError instanceof Error ? idError.message : String(idError)
      return res.status(500).json({ error: `Failed to get last insert id: ${message}` })
    }

    const newMemoResult = getMemosFromQuery('SELECT * FROM memos WHERE id = ?', [lastId])
    if (newMemoResult.error) {
      return res.status(500).json({ error: `Failed to retrieve new memo: ${newMemoResult.error}` })
    }
    if (newMemoResult.data.length === 0) {
      return res.status(500).json({ error: 'Inserted memo not found' })
    }

    const saveResult = saveDatabase()
    if (!saveResult.success) {
      return res.status(500).json({ error: `Failed to persist data: ${saveResult.error}` })
    }

    res.status(201).json(newMemoResult.data[0])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Unexpected error creating memo:', message)
    res.status(500).json({ error: `Unexpected error: ${message}` })
  }
})

app.put('/api/memos/:id', (req: Request, res: Response) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: 'Path parameter "id" is required' })
  }

  const idNum = Number(id)
  if (!isValidInteger(idNum)) {
    return res.status(400).json({ error: 'Path parameter "id" must be a valid integer' })
  }
  if (idNum <= 0) {
    return res.status(400).json({ error: 'Path parameter "id" must be a positive integer' })
  }

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object' })
  }

  const { content } = req.body as Partial<UpdateMemoInput>

  if (content === undefined || content === null) {
    return res.status(400).json({ error: 'Field "content" is required' })
  }
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Field "content" must be a string' })
  }

  const trimmedContent = content.trim()
  if (trimmedContent.length === 0) {
    return res.status(400).json({ error: 'Field "content" cannot be empty or whitespace only' })
  }
  if (trimmedContent.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({
      error: `Field "content" exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
      maxLength: MAX_CONTENT_LENGTH,
      currentLength: trimmedContent.length,
    })
  }

  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' })
    }

    const existingResult = getMemosFromQuery('SELECT * FROM memos WHERE id = ?', [idNum])
    if (existingResult.error) {
      return res.status(500).json({ error: `Failed to check memo existence: ${existingResult.error}` })
    }
    if (existingResult.data.length === 0) {
      return res.status(404).json({ error: `Memo with id ${idNum} not found` })
    }

    const stmt = db.prepare('UPDATE memos SET content = ? WHERE id = ?')
    try {
      stmt.run([trimmedContent, idNum])
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : String(updateError)
      stmt.free()
      return res.status(500).json({ error: `Failed to update memo: ${message}` })
    }
    stmt.free()

    const updatedResult = getMemosFromQuery('SELECT * FROM memos WHERE id = ?', [idNum])
    if (updatedResult.error) {
      return res.status(500).json({ error: `Failed to retrieve updated memo: ${updatedResult.error}` })
    }
    if (updatedResult.data.length === 0) {
      return res.status(500).json({ error: 'Updated memo not found' })
    }

    const saveResult = saveDatabase()
    if (!saveResult.success) {
      return res.status(500).json({ error: `Failed to persist data: ${saveResult.error}` })
    }

    res.json(updatedResult.data[0])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Unexpected error updating memo:', message)
    res.status(500).json({ error: `Unexpected error: ${message}` })
  }
})

app.delete('/api/memos/:id', (req: Request, res: Response) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: 'Path parameter "id" is required' })
  }

  const idNum = Number(id)
  if (!isValidInteger(idNum)) {
    return res.status(400).json({ error: 'Path parameter "id" must be a valid integer' })
  }
  if (idNum <= 0) {
    return res.status(400).json({ error: 'Path parameter "id" must be a positive integer' })
  }

  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' })
    }

    const existingResult = getMemosFromQuery('SELECT * FROM memos WHERE id = ?', [idNum])
    if (existingResult.error) {
      return res.status(500).json({ error: `Failed to check memo existence: ${existingResult.error}` })
    }
    if (existingResult.data.length === 0) {
      return res.status(404).json({ error: `Memo with id ${idNum} not found` })
    }

    const stmt = db.prepare('DELETE FROM memos WHERE id = ?')
    try {
      stmt.run([idNum])
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : String(deleteError)
      stmt.free()
      return res.status(500).json({ error: `Failed to delete memo: ${message}` })
    }
    stmt.free()

    const saveResult = saveDatabase()
    if (!saveResult.success) {
      return res.status(500).json({ error: `Failed to persist data: ${saveResult.error}` })
    }

    res.json({
      message: `Memo with id ${idNum} deleted successfully`,
      deletedId: idNum,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Unexpected error deleting memo:', message)
    res.status(500).json({ error: `Unexpected error: ${message}` })
  }
})

app.get('/api/memos/date', (req: Request, res: Response) => {
  try {
    const { start, end } = req.query as MemoDateQuery

    let startNum: number | null = null
    let endNum: number | null = null

    if (start !== undefined && start !== null && start !== '') {
      startNum = Number(start)
      if (!isValidNumber(startNum)) {
        return res.status(400).json({ error: 'Query parameter "start" must be a valid number' })
      }
      if (startNum < TIMESTAMP_MIN || startNum > TIMESTAMP_MAX) {
        return res.status(400).json({ error: 'Query parameter "start" is out of valid range' })
      }
    }

    if (end !== undefined && end !== null && end !== '') {
      endNum = Number(end)
      if (!isValidNumber(endNum)) {
        return res.status(400).json({ error: 'Query parameter "end" must be a valid number' })
      }
      if (endNum < TIMESTAMP_MIN || endNum > TIMESTAMP_MAX) {
        return res.status(400).json({ error: 'Query parameter "end" is out of valid range' })
      }
    }

    if (startNum !== null && endNum !== null && startNum > endNum) {
      return res.status(400).json({ error: 'Query parameter "start" must be less than or equal to "end"' })
    }

    let query = 'SELECT * FROM memos'
    const params: number[] = []

    const conditions: string[] = []
    if (startNum !== null) {
      conditions.push('timestamp >= ?')
      params.push(startNum)
    }
    if (endNum !== null) {
      conditions.push('timestamp <= ?')
      params.push(endNum)
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY timestamp DESC'

    const result = getMemosFromQuery(query, params)
    if (result.error) {
      return res.status(500).json({ error: result.error })
    }
    res.json(result.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Unexpected error fetching memos by date:', message)
    res.status(500).json({ error: `Unexpected error: ${message}` })
  }
})

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`GeoMemo server running on http://localhost:${PORT}`)
  })
}).catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('Failed to initialize database:', message)
  process.exit(1)
})

export default app
