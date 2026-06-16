import express from 'express'
import cors from 'cors'
import initSqlJs from 'sql.js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

const DB_PATH = path.join(__dirname, 'ideas.db')

let db: initSqlJs.Database | null = null

function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

async function initDb() {
  const SQL = await initSqlJs()

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    note TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    createdAt TEXT NOT NULL
  )`)

  saveDb()
  console.log('SQLite (sql.js) initialized')
}

interface IdeaRow {
  id: string
  content: string
  note: string
  tags: string
  createdAt: string
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都',
    '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
    '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'shall', 'can',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
    'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
    'and', 'or', 'but', 'if', 'of', 'at', 'by', 'for', 'with',
    'about', 'to', 'from', 'in', 'on', 'up', 'out', 'so', 'no',
    'not', 'this', 'that', 'these', 'those', 'what', 'which', 'who',
    'how', 'when', 'where', 'why', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too',
    'very', 'just', 'then', 'now', 'here', 'there', 'into', 'over',
  ])
  const words = text
    .replace(/[^\w\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()))
  return [...new Set(words)]
}

function computeSimilarity(wordsA: string[], wordsB: string[]): number {
  if (wordsA.length === 0 || wordsB.length === 0) return 0
  const setA = new Set(wordsA.map((w) => w.toLowerCase()))
  const setB = new Set(wordsB.map((w) => w.toLowerCase()))
  let intersection = 0
  setA.forEach((w) => {
    if (setB.has(w)) intersection++
  })
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

function queryAll(sql: string, params: unknown[] = []): IdeaRow[] {
  if (!db) return []
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: IdeaRow[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as IdeaRow)
  }
  stmt.free()
  return rows
}

app.post('/api/ideas', (req, res) => {
  const { content } = req.body
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: '内容不能为空' })
    return
  }

  const id = uuidv4()
  const tags = extractKeywords(content)
  const tagsJson = JSON.stringify(tags)
  const createdAt = new Date().toISOString()

  db!.run(
    'INSERT INTO ideas (id, content, note, tags, createdAt) VALUES (?, ?, ?, ?, ?)',
    [id, content.trim(), '', tagsJson, createdAt]
  )
  saveDb()

  res.json({
    idea: { id, content: content.trim(), note: '', tags, createdAt },
  })
})

app.get('/api/ideas', (_req, res) => {
  const rows = queryAll('SELECT * FROM ideas ORDER BY createdAt DESC')
  const ideas = rows.map((row) => ({
    ...row,
    tags: JSON.parse((row.tags as string) || '[]'),
  }))
  res.json({ ideas })
})

app.post('/api/cluster', (_req, res) => {
  const rows = queryAll('SELECT * FROM ideas')

  if (rows.length === 0) {
    res.json({ clusters: [], links: [] })
    return
  }

  const ideas = rows.map((row) => ({
    ...row,
    tags: JSON.parse((row.tags as string) || '[]'),
  }))

  const ideaKeywords = ideas.map((idea) => ({
    id: idea.id,
    content: idea.content,
    keywords: extractKeywords(idea.content),
  }))

  const SIMILARITY_THRESHOLD = 0.15

  const links: { source: string; target: string; strength: number }[] = []
  for (let i = 0; i < ideaKeywords.length; i++) {
    for (let j = i + 1; j < ideaKeywords.length; j++) {
      const sim = computeSimilarity(
        ideaKeywords[i].keywords,
        ideaKeywords[j].keywords
      )
      if (sim >= SIMILARITY_THRESHOLD) {
        links.push({
          source: ideaKeywords[i].id,
          target: ideaKeywords[j].id,
          strength: sim,
        })
      }
    }
  }

  const visited = new Set<string>()
  const clusters: { id: string; label: string; ideaIds: string[] }[] = []

  function bfs(startId: string): string[] {
    const queue = [startId]
    const component: string[] = []
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      component.push(current)
      for (const link of links) {
        if (link.source === current && !visited.has(link.target)) {
          queue.push(link.target)
        }
        if (link.target === current && !visited.has(link.source)) {
          queue.push(link.source)
        }
      }
    }
    return component
  }

  for (const ik of ideaKeywords) {
    if (!visited.has(ik.id)) {
      const component = bfs(ik.id)
      const clusterIdeas = ideas.filter((idea) => component.includes(idea.id))
      const allKeywords = clusterIdeas.flatMap((idea) =>
        extractKeywords(idea.content)
      )
      const keywordFreq = new Map<string, number>()
      allKeywords.forEach((kw) => {
        keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1)
      })
      const topKeyword =
        [...keywordFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
        '未分类'
      clusters.push({
        id: uuidv4(),
        label: topKeyword,
        ideaIds: component,
      })
    }
  }

  res.json({ clusters, links })
})

app.put('/api/ideas/:id', (req, res) => {
  const { id } = req.params
  const { content, note } = req.body

  if (content !== undefined) {
    const tags = extractKeywords(content)
    const tagsJson = JSON.stringify(tags)
    db!.run('UPDATE ideas SET content = ?, tags = ? WHERE id = ?', [
      content,
      tagsJson,
      id,
    ])
    saveDb()
    res.json({ success: true })
  } else if (note !== undefined) {
    db!.run('UPDATE ideas SET note = ? WHERE id = ?', [note, id])
    saveDb()
    res.json({ success: true })
  } else {
    res.status(400).json({ error: '缺少更新内容' })
  }
})

const PORT = process.env.PORT || 3001

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`)
  })
})
