import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import type { NoteCard, Category } from '../types'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const DATA_DIR = path.join(process.cwd(), 'data')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
const NOTES_FILE = path.join(DATA_DIR, 'notes.json')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, '[]')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, _file, cb) => cb(null, `${uuidv4()}.webm`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

const readNotes = (): NoteCard[] => {
  try {
    const raw = fs.readFileSync(NOTES_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

const writeNotes = (notes: NoteCard[]) => {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2))
}

const mockTranscribe = (duration: number): string => {
  const samples = [
    '今天的会议要点是讨论项目进度和下周的安排，大家需要提前准备好相关资料。',
    '记得下班后去超市买牛奶和面包，还有周末要给妈妈打电话。',
    '刚才想到一个新的产品创意，可以结合AI和用户的日常习惯来做个性化推荐。',
    '明天上午十点和张总见面谈合作的事情，需要把合同草案打印出来。',
    '学习TypeScript的泛型用法，还有React hooks的最佳实践，整理成笔记。',
    '晚上要去健身房锻炼一小时，主要练背部和手臂的力量训练。',
    '这个季度的KPI完成情况还不错，下个月重点放在客户拓展方面。',
    '给狗狗预约下周的疫苗接种，顺便买一些新的玩具和零食。',
  ]
  const idx = Math.floor(Math.random() * samples.length)
  if (duration <= 3) {
    return samples[idx].slice(0, 20) + '...'
  }
  return samples[idx]
}

app.post('/api/notes', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file' })
      return
    }
    const duration = parseInt(req.body.duration as string) || 5
    const waveform = JSON.parse(req.body.waveform || '[]') as number[]

    await new Promise(r => setTimeout(r, 800 + Math.random() * 1000))

    const text = mockTranscribe(duration)

    const note: NoteCard = {
      id: uuidv4(),
      text,
      audioPath: req.file.filename,
      duration,
      category: 'life',
      createdAt: Date.now(),
      waveform: waveform.length > 0 ? waveform : new Array(50).fill(0).map(() => Math.random() * 0.6 + 0.2),
    }

    const notes = readNotes()
    notes.unshift(note)
    writeNotes(notes)

    res.json(note)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/notes', (_req, res) => {
  const notes = readNotes()
  res.json(notes)
})

app.get('/api/audio/:id', (req, res) => {
  const notes = readNotes()
  const note = notes.find(n => n.id === req.params.id)
  if (!note) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const filePath = path.join(UPLOADS_DIR, note.audioPath)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Audio not found' })
    return
  }
  res.sendFile(filePath)
})

app.put('/api/notes/:id', (req, res) => {
  const { text, category } = req.body as { text: string; category: Exclude<Category, 'all'> }
  const notes = readNotes()
  const idx = notes.findIndex(n => n.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  notes[idx] = {
    ...notes[idx],
    text: text ?? notes[idx].text,
    category: category ?? notes[idx].category,
  }
  writeNotes(notes)
  res.json(notes[idx])
})

app.delete('/api/notes/:id', (req, res) => {
  const notes = readNotes()
  const note = notes.find(n => n.id === req.params.id)
  if (note) {
    const filePath = path.join(UPLOADS_DIR, note.audioPath)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
  const filtered = notes.filter(n => n.id !== req.params.id)
  writeNotes(filtered)
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`Echo Notes server running on http://localhost:${PORT}`)
})
