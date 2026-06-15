import express from 'express'
import multiparty from 'multiparty'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

app.use(express.json({ limit: '50mb' }))
app.use('/uploads', express.static(uploadsDir))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

interface SvgCacheEntry {
  svg: string
  expiresAt: number
}

const svgCache = new Map<string, SvgCacheEntry>()

const SVG_CACHE_TTL = 5 * 60 * 1000
const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg']

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of svgCache.entries()) {
    if (entry.expiresAt < now) {
      svgCache.delete(key)
    }
  }
}, 60000)

app.post('/api/upload', (req, res) => {
  const form = new multiparty.Form({
    uploadDir: uploadsDir,
    maxFilesSize: MAX_FILE_SIZE
  })

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Upload parse error:', err)
      return res.status(400).json({ error: '文件解析失败: ' + err.message })
    }

    const audioFile = files.audio?.[0]
    if (!audioFile) {
      return res.status(400).json({ error: '未找到音频文件' })
    }

    const ext = path.extname(audioFile.originalFilename || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      fs.unlink(audioFile.path, () => {})
      return res.status(400).json({ error: '不支持的文件格式，仅支持 mp3/wav/ogg' })
    }

    const fileName = path.basename(audioFile.path)
    const fileUrl = `/uploads/${fileName}`
    const originalName = audioFile.originalFilename || fileName

    res.json({
      success: true,
      fileUrl,
      filePath: audioFile.path,
      fileName: originalName,
      size: audioFile.size
    })
  })
})

app.post('/api/svg/save', (req, res) => {
  const { svg } = req.body
  if (!svg || typeof svg !== 'string') {
    return res.status(400).json({ error: 'SVG内容无效' })
  }

  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  svgCache.set(id, {
    svg,
    expiresAt: Date.now() + SVG_CACHE_TTL
  })

  res.json({
    success: true,
    id,
    url: `/api/svg/${id}`
  })
})

app.get('/api/svg/:id', (req, res) => {
  const { id } = req.params
  const entry = svgCache.get(id)

  if (!entry) {
    return res.status(404).json({ error: 'SVG不存在或已过期' })
  }

  if (entry.expiresAt < Date.now()) {
    svgCache.delete(id)
    return res.status(410).json({ error: 'SVG已过期' })
  }

  res.type('image/svg+xml')
  res.send(entry.svg)
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`Voiceprint Server running on http://localhost:${PORT}`)
})
