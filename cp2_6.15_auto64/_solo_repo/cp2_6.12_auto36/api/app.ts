import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { all, get, run, uuidv4 } from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Cache ──

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_TTL = 5000
const cache = new Map<string, CacheEntry<unknown>>()

function getCache<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return undefined
  }
  return entry.data
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

// ── Annotation helper ──

function convertAnnotation<T extends Record<string, unknown>>(anno: T): T {
  const result = { ...anno }
  if ('isRead' in result) {
    result.isRead = result.isRead === 1 || result.isRead === true
  }
  return result as T
}

// ── Health ──

app.use('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ message: 'ok' })
})

// ── Knowledge Bases ──

app.get('/api/knowledge-bases', (_req: Request, res: Response) => {
  try {
    const cacheKey = 'kb:list'
    const cached = getCache(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
    const rows = all(
      `SELECT kb.*, (SELECT COUNT(*) FROM categories c WHERE c.knowledge_base_id = kb.id) as category_count, (SELECT COUNT(*) FROM documents d JOIN categories c ON d.category_id = c.id WHERE c.knowledge_base_id = kb.id) as document_count FROM knowledge_bases kb ORDER BY kb.updated_at DESC;`
    )
    setCache(cacheKey, rows)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list knowledge bases' })
  }
})

app.post('/api/knowledge-bases', (req: Request, res: Response) => {
  try {
    const { name, description } = req.body
    if (!name) {
      res.status(400).json({ error: 'Name is required' })
      return
    }
    const id = uuidv4()
    run(
      `INSERT INTO knowledge_bases (id, name, description) VALUES (?, ?, ?);`,
      [id, name, description || '']
    )
    const row = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [id])
    invalidateCache('kb:')
    res.status(201).json(row)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create knowledge base' })
  }
})

app.put('/api/knowledge-bases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ error: 'Knowledge base not found' })
      return
    }
    const { name, description } = req.body
    run(
      `UPDATE knowledge_bases SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?;`,
      [name ?? existing.name, description ?? existing.description, id]
    )
    const row = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [id])
    invalidateCache('kb:')
    res.json(row)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update knowledge base' })
  }
})

app.delete('/api/knowledge-bases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ error: 'Knowledge base not found' })
      return
    }
    run(`DELETE FROM knowledge_bases WHERE id = ?;`, [id])
    invalidateCache('kb:')
    invalidateCache('cat:')
    res.json(null)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete knowledge base' })
  }
})

// ── Categories ──

app.get('/api/knowledge-bases/:kbId/categories', (req: Request, res: Response) => {
  try {
    const { kbId } = req.params
    const cacheKey = `cat:list:${kbId}`
    const cached = getCache(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
    const rows = all(
      `SELECT c.*, (SELECT COUNT(*) FROM documents d WHERE d.category_id = c.id) as document_count FROM categories c WHERE c.knowledge_base_id = ? ORDER BY c."order" ASC;`,
      [kbId]
    )
    setCache(cacheKey, rows)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list categories' })
  }
})

app.post('/api/knowledge-bases/:kbId/categories', (req: Request, res: Response) => {
  try {
    const { kbId } = req.params
    const existing = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [kbId])
    if (!existing) {
      res.status(404).json({ error: 'Knowledge base not found' })
      return
    }
    const { name, order } = req.body
    if (!name) {
      res.status(400).json({ error: 'Name is required' })
      return
    }
    const id = uuidv4()
    run(
      `INSERT INTO categories (id, knowledge_base_id, name, "order") VALUES (?, ?, ?, ?);`,
      [id, kbId, name, order ?? 0]
    )
    const row = get(`SELECT * FROM categories WHERE id = ?;`, [id])
    invalidateCache('cat:')
    invalidateCache('kb:')
    res.status(201).json(row)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' })
  }
})

app.put('/api/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM categories WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ error: 'Category not found' })
      return
    }
    const { name, order } = req.body
    run(
      `UPDATE categories SET name = ?, "order" = ? WHERE id = ?;`,
      [name ?? existing.name, order ?? existing.order, id]
    )
    const row = get(`SELECT * FROM categories WHERE id = ?;`, [id])
    invalidateCache('cat:')
    res.json(row)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' })
  }
})

app.delete('/api/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM categories WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ error: 'Category not found' })
      return
    }
    run(`DELETE FROM categories WHERE id = ?;`, [id])
    invalidateCache('cat:')
    invalidateCache('doc:')
    invalidateCache('kb:')
    res.json(null)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

// ── Documents ──

app.get('/api/categories/:catId/documents', (req: Request, res: Response) => {
  try {
    const { catId } = req.params
    const cacheKey = `doc:list:${catId}`
    const cached = getCache(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
    const rows = all(
      `SELECT id, category_id, title, created_at, updated_at FROM documents WHERE category_id = ? ORDER BY updated_at DESC;`,
      [catId]
    )
    setCache(cacheKey, rows)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list documents' })
  }
})

app.post('/api/categories/:catId/documents', (req: Request, res: Response) => {
  try {
    const { catId } = req.params
    const existing = get(`SELECT * FROM categories WHERE id = ?;`, [catId])
    if (!existing) {
      res.status(404).json({ error: 'Category not found' })
      return
    }
    const { title, content } = req.body
    if (!title) {
      res.status(400).json({ error: 'Title is required' })
      return
    }
    const id = uuidv4()
    const docContent = content || ''
    run(
      `INSERT INTO documents (id, category_id, title, content) VALUES (?, ?, ?, ?);`,
      [id, catId, title, docContent]
    )
    run(
      `INSERT INTO document_versions (id, document_id, content, version_number) VALUES (?, ?, ?, ?);`,
      [uuidv4(), id, docContent, 1]
    )
    const row = get(`SELECT * FROM documents WHERE id = ?;`, [id])
    invalidateCache('doc:')
    invalidateCache('cat:')
    invalidateCache('search:')
    res.status(201).json(row)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create document' })
  }
})

app.get('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const cacheKey = `doc:${id}`
    const cached = getCache(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
    const row = get(`SELECT * FROM documents WHERE id = ?;`, [id])
    if (!row) {
      res.status(404).json({ error: 'Document not found' })
      return
    }
    setCache(cacheKey, row)
    res.json(row)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get document' })
  }
})

app.put('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM documents WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ error: 'Document not found' })
      return
    }
    const { title, content } = req.body
    const newTitle = title ?? existing.title
    const newContent = content ?? existing.content

    run(
      `UPDATE documents SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?;`,
      [newTitle, newContent, id]
    )

    const versionRow = get<{ maxVer: number }>(
      `SELECT MAX(version_number) as max_ver FROM document_versions WHERE document_id = ?;`,
      [id]
    )
    const nextVersion = (versionRow?.maxVer ?? 0) + 1
    run(
      `INSERT INTO document_versions (id, document_id, content, version_number) VALUES (?, ?, ?, ?);`,
      [uuidv4(), id, newContent, nextVersion]
    )

    const row = get(`SELECT * FROM documents WHERE id = ?;`, [id])
    invalidateCache('doc:')
    invalidateCache('search:')
    res.json(row)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update document' })
  }
})

app.delete('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM documents WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ error: 'Document not found' })
      return
    }
    run(`DELETE FROM documents WHERE id = ?;`, [id])
    invalidateCache('doc:')
    invalidateCache('search:')
    invalidateCache('cat:')
    res.json(null)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' })
  }
})

app.get('/api/documents/:id/versions', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const cacheKey = `ver:list:${id}`
    const cached = getCache(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
    const rows = all(
      `SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC;`,
      [id]
    )
    setCache(cacheKey, rows)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list versions' })
  }
})

app.get('/api/documents/:id/versions/:versionId', (req: Request, res: Response) => {
  try {
    const { versionId } = req.params
    const cacheKey = `ver:${versionId}`
    const cached = getCache(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
    const row = get(`SELECT * FROM document_versions WHERE id = ?;`, [versionId])
    if (!row) {
      res.status(404).json({ error: 'Version not found' })
      return
    }
    setCache(cacheKey, row)
    res.json(row)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get version' })
  }
})

// ── Search ──

app.get('/api/search', (req: Request, res: Response) => {
  try {
    const keyword = (req.query.q as string || '').trim()
    const kbId = req.query.kbId as string | undefined

    if (!keyword) {
      res.json([])
      return
    }

    const cacheKey = `search:${keyword}:${kbId || 'all'}`
    const cached = getCache(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }

    const likePattern = `%${keyword}%`

    let sql = `
      SELECT d.id as document_id, d.title, d.content,
        c.id as category_id, c.name as category_name,
        kb.id as kb_id, kb.name as kb_name
      FROM documents d
      JOIN categories c ON d.category_id = c.id
      JOIN knowledge_bases kb ON c.knowledge_base_id = kb.id
      WHERE (d.title LIKE ? OR d.content LIKE ?)
    `
    const params: unknown[] = [likePattern, likePattern]

    if (kbId) {
      sql += ` AND kb.id = ?`
      params.push(kbId)
    }

    const rows = all<{
      documentId: string
      title: string
      content: string
      categoryId: string
      categoryName: string
      kbId: string
      kbName: string
    }>(sql, params)

    const lowerKeyword = keyword.toLowerCase()

    const results = rows.map((row) => {
      const lowerTitle = row.title.toLowerCase()
      const lowerContent = row.content.toLowerCase()

      const titleExactMatch = lowerTitle === lowerKeyword
      const titleIncludes = lowerTitle.includes(lowerKeyword)
      const titleMatch = titleExactMatch || titleIncludes

      let score = 0

      if (titleExactMatch) {
        score += 50
      } else if (titleIncludes) {
        score += 30
        const titleIdx = lowerTitle.indexOf(lowerKeyword)
        if (titleIdx < 10) score += 10
        else if (titleIdx < 30) score += 5
      }

      let contentCount = 0
      const contentHighlights: { start: number; end: number }[] = []
      let idx = lowerContent.indexOf(lowerKeyword)
      while (idx !== -1) {
        contentCount++
        contentHighlights.push({ start: idx, end: idx + keyword.length })
        idx = lowerContent.indexOf(lowerKeyword, idx + 1)
      }

      const titleHighlights: { start: number; end: number }[] = []
      if (titleMatch) {
        let titleIdx = lowerTitle.indexOf(lowerKeyword)
        while (titleIdx !== -1) {
          titleHighlights.push({ start: titleIdx, end: titleIdx + keyword.length })
          titleIdx = lowerTitle.indexOf(lowerKeyword, titleIdx + 1)
        }
      }

      score += Math.min(contentCount * 5, 50)

      if (contentHighlights.length > 0) {
        const firstPos = contentHighlights[0].start
        if (firstPos < 100) score += 10
        else if (firstPos < 500) score += 5
      }

      const contentMatch = contentCount > 0

      let matchType: 'title' | 'content' | 'both'
      if (titleMatch && contentMatch) matchType = 'both'
      else if (titleMatch) matchType = 'title'
      else matchType = 'content'

      const highlights = matchType === 'title' ? titleHighlights : contentHighlights

      return {
        documentId: row.documentId,
        title: row.title,
        content: row.content,
        matchType,
        score,
        highlights,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        kbId: row.kbId,
        kbName: row.kbName,
      }
    })

    results.sort((a, b) => b.score - a.score)

    const limited = results.slice(0, 20)

    setCache(cacheKey, limited)
    res.json(limited)
  } catch (error) {
    res.status(500).json({ error: 'Search failed' })
  }
})

// ── Annotations ──

app.get('/api/documents/:docId/annotations', (req: Request, res: Response) => {
  try {
    const { docId } = req.params
    const cacheKey = `anno:${docId}`
    const cached = getCache(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }
    const topLevel = all(
      `SELECT * FROM annotations WHERE document_id = ? AND parent_id IS NULL ORDER BY created_at ASC;`,
      [docId]
    )
    const replies = all(
      `SELECT * FROM annotations WHERE document_id = ? AND parent_id IS NOT NULL ORDER BY created_at ASC;`,
      [docId]
    )

    const replyMap = new Map<string, unknown[]>()
    for (const reply of replies) {
      const convertedReply = convertAnnotation(reply as Record<string, unknown>)
      const parentId = convertedReply.parentId as string
      if (!replyMap.has(parentId)) {
        replyMap.set(parentId, [])
      }
      replyMap.get(parentId)!.push(convertedReply)
    }

    const nested = topLevel.map((annotation) => {
      const converted = convertAnnotation(annotation as Record<string, unknown>)
      return {
        ...converted,
        replies: replyMap.get(converted.id as string) || [],
      }
    })

    setCache(cacheKey, nested)
    res.json(nested)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list annotations' })
  }
})

app.post('/api/documents/:docId/annotations', (req: Request, res: Response) => {
  try {
    const { docId } = req.params
    const existing = get(`SELECT * FROM documents WHERE id = ?;`, [docId])
    if (!existing) {
      res.status(404).json({ error: 'Document not found' })
      return
    }
    const { paragraphIndex, content, userId, parentId } = req.body
    if (content === undefined || content === null) {
      res.status(400).json({ error: 'Content is required' })
      return
    }
    if (paragraphIndex === undefined || paragraphIndex === null) {
      res.status(400).json({ error: 'paragraphIndex is required' })
      return
    }
    const id = uuidv4()
    run(
      `INSERT INTO annotations (id, document_id, paragraph_index, content, user_id, parent_id) VALUES (?, ?, ?, ?, ?, ?);`,
      [id, docId, paragraphIndex, content, userId || 'default_user', parentId || null]
    )
    const row = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    const converted = convertAnnotation(row as Record<string, unknown>)
    invalidateCache(`anno:${docId}`)
    res.status(201).json(converted)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create annotation' })
  }
})

app.put('/api/annotations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ error: 'Annotation not found' })
      return
    }
    const { content, isRead } = req.body
    const newContent = content ?? existing.content
    const existingRecord = existing as Record<string, unknown>
    const newIsRead = isRead !== undefined ? (isRead ? 1 : 0) : existingRecord.isRead
    run(
      `UPDATE annotations SET content = ?, is_read = ? WHERE id = ?;`,
      [newContent, newIsRead, id]
    )
    const row = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    const converted = convertAnnotation(row as Record<string, unknown>)
    invalidateCache(`anno:${existingRecord.documentId as string}`)
    res.json(converted)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update annotation' })
  }
})

app.delete('/api/annotations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ error: 'Annotation not found' })
      return
    }
    run(`DELETE FROM annotations WHERE id = ?;`, [id])
    const existingRecord = existing as Record<string, unknown>
    invalidateCache(`anno:${existingRecord.documentId as string}`)
    res.json(null)
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete annotation' })
  }
})

app.post('/api/annotations/:id/reply', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ error: 'Parent annotation not found' })
      return
    }
    const existingRecord = existing as Record<string, unknown>
    const { content, userId } = req.body
    if (!content) {
      res.status(400).json({ error: 'Content is required' })
      return
    }
    const replyId = uuidv4()
    run(
      `INSERT INTO annotations (id, document_id, paragraph_index, content, user_id, parent_id) VALUES (?, ?, ?, ?, ?, ?);`,
      [replyId, existingRecord.documentId, existingRecord.paragraphIndex, content, userId || 'default_user', id]
    )
    const row = get(`SELECT * FROM annotations WHERE id = ?;`, [replyId])
    const converted = convertAnnotation(row as Record<string, unknown>)
    invalidateCache(`anno:${existingRecord.documentId as string}`)
    res.status(201).json(converted)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create reply' })
  }
})

// ── Error handlers ──

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({ error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'API not found' })
})

export default app
