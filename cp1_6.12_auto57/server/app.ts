import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import type { NoteData } from '../src/types/index.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, '..', 'data')

app.use(express.json({ limit: '10mb' }))

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const getNotePath = (id: string) => path.join(DATA_DIR, `${id}.json`)

app.post('/api/notes', (req, res) => {
  try {
    const { content, tree } = req.body as { content: string; tree: any[] }
    const id = uuidv4()
    const noteData: NoteData = {
      id,
      content,
      tree,
      updatedAt: Date.now()
    }
    fs.writeFileSync(getNotePath(id), JSON.stringify(noteData, null, 2), 'utf-8')
    res.json({ success: true, id })
  } catch (error) {
    console.error('Save error:', error)
    res.status(500).json({ success: false, error: 'Failed to save note' })
  }
})

app.get('/api/notes/:id', (req, res) => {
  try {
    const { id } = req.params
    const notePath = getNotePath(id)
    if (!fs.existsSync(notePath)) {
      res.status(404).json({ success: false, error: 'Note not found' })
      return
    }
    const data = fs.readFileSync(notePath, 'utf-8')
    const noteData: NoteData = JSON.parse(data)
    res.json({ success: true, data: noteData })
  } catch (error) {
    console.error('Read error:', error)
    res.status(500).json({ success: false, error: 'Failed to read note' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
