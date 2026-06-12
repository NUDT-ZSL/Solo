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

app.use('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

// ── Knowledge Bases ──

app.get('/api/knowledge-bases', (_req: Request, res: Response) => {
  try {
    const rows = all(
      `SELECT kb.*, (SELECT COUNT(*) FROM categories c WHERE c.knowledge_base_id = kb.id) as category_count, (SELECT COUNT(*) FROM documents d JOIN categories c ON d.category_id = c.id WHERE c.knowledge_base_id = kb.id) as document_count FROM knowledge_bases kb ORDER BY kb.updated_at DESC;`
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list knowledge bases' })
  }
})

app.post('/api/knowledge-bases', (req: Request, res: Response) => {
  try {
    const { name, description } = req.body
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' })
      return
    }
    const id = uuidv4()
    run(
      `INSERT INTO knowledge_bases (id, name, description) VALUES (?, ?, ?);`,
      [id, name, description || '']
    )
    const row = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [id])
    res.status(201).json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create knowledge base' })
  }
})

app.put('/api/knowledge-bases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Knowledge base not found' })
      return
    }
    const { name, description } = req.body
    run(
      `UPDATE knowledge_bases SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?;`,
      [name ?? existing.name, description ?? existing.description, id]
    )
    const row = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [id])
    res.json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update knowledge base' })
  }
})

app.delete('/api/knowledge-bases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Knowledge base not found' })
      return
    }
    run(`DELETE FROM knowledge_bases WHERE id = ?;`, [id])
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete knowledge base' })
  }
})

// ── Categories ──

app.get('/api/knowledge-bases/:kbId/categories', (req: Request, res: Response) => {
  try {
    const { kbId } = req.params
    const rows = all(
      `SELECT c.*, (SELECT COUNT(*) FROM documents d WHERE d.category_id = c.id) as document_count FROM categories c WHERE c.knowledge_base_id = ? ORDER BY c."order" ASC;`,
      [kbId]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list categories' })
  }
})

app.post('/api/knowledge-bases/:kbId/categories', (req: Request, res: Response) => {
  try {
    const { kbId } = req.params
    const existing = get(`SELECT * FROM knowledge_bases WHERE id = ?;`, [kbId])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Knowledge base not found' })
      return
    }
    const { name, order } = req.body
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' })
      return
    }
    const id = uuidv4()
    run(
      `INSERT INTO categories (id, knowledge_base_id, name, "order") VALUES (?, ?, ?, ?);`,
      [id, kbId, name, order ?? 0]
    )
    const row = get(`SELECT * FROM categories WHERE id = ?;`, [id])
    res.status(201).json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create category' })
  }
})

app.put('/api/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM categories WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Category not found' })
      return
    }
    const { name, order } = req.body
    run(
      `UPDATE categories SET name = ?, "order" = ? WHERE id = ?;`,
      [name ?? existing.name, order ?? existing.order, id]
    )
    const row = get(`SELECT * FROM categories WHERE id = ?;`, [id])
    res.json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update category' })
  }
})

app.delete('/api/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM categories WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Category not found' })
      return
    }
    run(`DELETE FROM categories WHERE id = ?;`, [id])
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete category' })
  }
})

// ── Documents ──

app.get('/api/categories/:catId/documents', (req: Request, res: Response) => {
  try {
    const { catId } = req.params
    const rows = all(
      `SELECT id, category_id, title, created_at, updated_at FROM documents WHERE category_id = ? ORDER BY updated_at DESC;`,
      [catId]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list documents' })
  }
})

app.post('/api/categories/:catId/documents', (req: Request, res: Response) => {
  try {
    const { catId } = req.params
    const existing = get(`SELECT * FROM categories WHERE id = ?;`, [catId])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Category not found' })
      return
    }
    const { title, content } = req.body
    if (!title) {
      res.status(400).json({ success: false, error: 'Title is required' })
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
    res.status(201).json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create document' })
  }
})

app.get('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const row = get(`SELECT * FROM documents WHERE id = ?;`, [id])
    if (!row) {
      res.status(404).json({ success: false, error: 'Document not found' })
      return
    }
    res.json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get document' })
  }
})

app.put('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM documents WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Document not found' })
      return
    }
    const { title, content } = req.body
    const newTitle = title ?? existing.title
    const newContent = content ?? existing.content

    run(
      `UPDATE documents SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?;`,
      [newTitle, newContent, id]
    )

    const versionRow = get<{ max_ver: number }>(
      `SELECT MAX(version_number) as max_ver FROM document_versions WHERE document_id = ?;`,
      [id]
    )
    const nextVersion = (versionRow?.max_ver ?? 0) + 1
    run(
      `INSERT INTO document_versions (id, document_id, content, version_number) VALUES (?, ?, ?, ?);`,
      [uuidv4(), id, newContent, nextVersion]
    )

    const row = get(`SELECT * FROM documents WHERE id = ?;`, [id])
    res.json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update document' })
  }
})

app.delete('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM documents WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Document not found' })
      return
    }
    run(`DELETE FROM documents WHERE id = ?;`, [id])
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete document' })
  }
})

app.get('/api/documents/:id/versions', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const rows = all(
      `SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number DESC;`,
      [id]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list versions' })
  }
})

app.get('/api/documents/:id/versions/:versionId', (req: Request, res: Response) => {
  try {
    const { versionId } = req.params
    const row = get(`SELECT * FROM document_versions WHERE id = ?;`, [versionId])
    if (!row) {
      res.status(404).json({ success: false, error: 'Version not found' })
      return
    }
    res.json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get version' })
  }
})

// ── Search ──

app.get('/api/search', (req: Request, res: Response) => {
  try {
    const keyword = (req.query.q as string || '').trim()
    const kbId = req.query.kbId as string | undefined

    if (!keyword) {
      res.json({ success: true, data: [] })
      return
    }

    const likePattern = `%${keyword}%`

    let sql = `
      SELECT d.id as documentId, d.title, d.content,
        c.id as categoryId, c.name as categoryName,
        kb.id as kbId, kb.name as kbName
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

    const results = rows.map((row) => {
      const titleMatch = row.title.toLowerCase().includes(keyword.toLowerCase())
      const contentMatch = row.content.toLowerCase().includes(keyword.toLowerCase())
      let score = 0
      let matchType = 'content'
      if (titleMatch) {
        score += 10
        matchType = 'title'
      }
      if (contentMatch) {
        score += 5
        if (titleMatch) matchType = 'both'
      }

      const highlights: string[] = []
      if (contentMatch) {
        const lowerContent = row.content.toLowerCase()
        const lowerKeyword = keyword.toLowerCase()
        let idx = lowerContent.indexOf(lowerKeyword)
        let count = 0
        while (idx !== -1 && count < 3) {
          const start = Math.max(0, idx - 30)
          const end = Math.min(row.content.length, idx + keyword.length + 30)
          const snippet = (start > 0 ? '...' : '') +
            row.content.slice(start, end) +
            (end < row.content.length ? '...' : '')
          highlights.push(snippet)
          idx = lowerContent.indexOf(lowerKeyword, idx + 1)
          count++
        }
      }

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

    res.json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Search failed' })
  }
})

// ── Annotations ──

app.get('/api/documents/:docId/annotations', (req: Request, res: Response) => {
  try {
    const { docId } = req.params
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
      const parentId = reply.parent_id as string
      if (!replyMap.has(parentId)) {
        replyMap.set(parentId, [])
      }
      replyMap.get(parentId)!.push(reply)
    }

    const nested = topLevel.map((annotation) => ({
      ...annotation,
      replies: replyMap.get(annotation.id as string) || [],
    }))

    res.json({ success: true, data: nested })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list annotations' })
  }
})

app.post('/api/documents/:docId/annotations', (req: Request, res: Response) => {
  try {
    const { docId } = req.params
    const existing = get(`SELECT * FROM documents WHERE id = ?;`, [docId])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Document not found' })
      return
    }
    const { paragraphIndex, content, userId } = req.body
    if (content === undefined || content === null) {
      res.status(400).json({ success: false, error: 'Content is required' })
      return
    }
    if (paragraphIndex === undefined || paragraphIndex === null) {
      res.status(400).json({ success: false, error: 'paragraphIndex is required' })
      return
    }
    const id = uuidv4()
    run(
      `INSERT INTO annotations (id, document_id, paragraph_index, content, user_id) VALUES (?, ?, ?, ?, ?);`,
      [id, docId, paragraphIndex, content, userId || 'default_user']
    )
    const row = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    res.status(201).json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create annotation' })
  }
})

app.put('/api/annotations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Annotation not found' })
      return
    }
    const { content, isRead } = req.body
    const newContent = content ?? existing.content
    const newIsRead = isRead !== undefined ? isRead : existing.is_read
    run(
      `UPDATE annotations SET content = ?, is_read = ? WHERE id = ?;`,
      [newContent, newIsRead, id]
    )
    const row = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    res.json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update annotation' })
  }
})

app.delete('/api/annotations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Annotation not found' })
      return
    }
    run(`DELETE FROM annotations WHERE id = ?;`, [id])
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete annotation' })
  }
})

app.post('/api/annotations/:id/reply', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const existing = get(`SELECT * FROM annotations WHERE id = ?;`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Parent annotation not found' })
      return
    }
    const { content, userId } = req.body
    if (!content) {
      res.status(400).json({ success: false, error: 'Content is required' })
      return
    }
    const replyId = uuidv4()
    run(
      `INSERT INTO annotations (id, document_id, paragraph_index, content, user_id, parent_id) VALUES (?, ?, ?, ?, ?, ?);`,
      [replyId, existing.document_id, existing.paragraph_index, content, userId || 'default_user', id]
    )
    const row = get(`SELECT * FROM annotations WHERE id = ?;`, [replyId])
    res.status(201).json({ success: true, data: row })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create reply' })
  }
})

// ── Error handlers ──

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
