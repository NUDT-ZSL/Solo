import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

interface DiaryEntry {
  id: string
  color: string
  colorName: string
  text: string
  date: string
  shortLink: string
  createdAt: number
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const diaries: Map<string, DiaryEntry> = new Map()
const shortLinkMap: Map<string, string> = new Map()

const generateShortLink = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  if (shortLinkMap.has(result)) {
    return generateShortLink()
  }
  return result
}

app.post('/api/diaries', (req, res) => {
  const { color, colorName, text } = req.body

  if (!color || !colorName || !text) {
    return res.status(400).json({ error: '缺少必要字段' })
  }

  if (text.length > 200) {
    return res.status(400).json({ error: '日记文字超过200字限制' })
  }

  const id = uuidv4()
  const shortLink = generateShortLink()
  const now = new Date()
  const entry: DiaryEntry = {
    id,
    color,
    colorName,
    text,
    date: now.toISOString(),
    shortLink,
    createdAt: now.getTime()
  }

  diaries.set(id, entry)
  shortLinkMap.set(shortLink, id)

  res.status(201).json(entry)
})

app.get('/api/diaries', (_req, res) => {
  const entries = Array.from(diaries.values()).sort((a, b) => b.createdAt - a.createdAt)
  res.json(entries)
})

app.get('/api/diaries/:id', (req, res) => {
  const entry = diaries.get(req.params.id)
  if (!entry) {
    return res.status(404).json({ error: '日记不存在' })
  }
  res.json(entry)
})

app.delete('/api/diaries/:id', (req, res) => {
  const entry = diaries.get(req.params.id)
  if (!entry) {
    return res.status(404).json({ error: '日记不存在' })
  }
  shortLinkMap.delete(entry.shortLink)
  diaries.delete(req.params.id)
  res.json({ success: true })
})

app.get('/s/:shortLink', (req, res) => {
  const id = shortLinkMap.get(req.params.shortLink)
  if (!id) {
    return res.status(404).json({ error: '短链接无效' })
  }
  const entry = diaries.get(id)
  if (!entry) {
    return res.status(404).json({ error: '日记不存在' })
  }
  res.json(entry)
})

app.get('/api/share/:id', (req, res) => {
  const entry = diaries.get(req.params.id)
  if (!entry) {
    return res.status(404).json({ error: '日记不存在' })
  }
  const shareUrl = `${req.protocol}://${req.get('host')}/s/${entry.shortLink}`
  res.json({ shortLink: entry.shortLink, shareUrl })
})

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`)
})
