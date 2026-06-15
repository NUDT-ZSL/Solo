import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '..', 'data')
const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
const recordsFile = path.join(dataDir, 'records.json')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

interface TeaRecord {
  id: string
  teaName: string
  variety: string
  temperature: number[]
  steepTime: number
  notes: string
  mood: string[]
  rating: number
  imageUrl: string
  createdAt: string
  updatedAt: string
}

function readRecords(): TeaRecord[] {
  if (!fs.existsSync(recordsFile)) return []
  const data = fs.readFileSync(recordsFile, 'utf-8')
  return JSON.parse(data)
}

function writeRecords(records: TeaRecord[]): void {
  fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2), 'utf-8')
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, uuidv4() + ext)
  },
})

const upload = multer({ storage })

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const records = readRecords()
  let filtered = records

  const { variety, mood } = req.query
  if (variety && typeof variety === 'string') {
    filtered = filtered.filter((r) => r.variety === variety)
  }
  if (mood && typeof mood === 'string') {
    filtered = filtered.filter((r) => r.mood.includes(mood))
  }

  res.json(filtered)
})

router.get('/:id', (req: Request, res: Response): void => {
  const records = readRecords()
  const record = records.find((r) => r.id === req.params.id)

  if (!record) {
    res.status(404).json({ success: false, error: 'Record not found' })
    return
  }

  res.json(record)
})

router.post('/', upload.single('image'), (req: Request, res: Response): void => {
  const records = readRecords()
  const now = new Date().toISOString()

  const newRecord: TeaRecord = {
    id: uuidv4(),
    teaName: req.body.teaName || '',
    variety: req.body.variety || '',
    temperature: req.body.temperature ? JSON.parse(req.body.temperature) : [],
    steepTime: req.body.steepTime ? Number(req.body.steepTime) : 0,
    notes: req.body.notes || '',
    mood: req.body.mood ? JSON.parse(req.body.mood) : [],
    rating: req.body.rating ? Number(req.body.rating) : 0,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : '',
    createdAt: now,
    updatedAt: now,
  }

  records.push(newRecord)
  writeRecords(records)

  res.status(201).json(newRecord)
})

router.put('/:id', upload.single('image'), (req: Request, res: Response): void => {
  const records = readRecords()
  const index = records.findIndex((r) => r.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Record not found' })
    return
  }

  const existing = records[index]
  const now = new Date().toISOString()

  const updated: TeaRecord = {
    ...existing,
    teaName: req.body.teaName ?? existing.teaName,
    variety: req.body.variety ?? existing.variety,
    temperature: req.body.temperature ? JSON.parse(req.body.temperature) : existing.temperature,
    steepTime: req.body.steepTime ? Number(req.body.steepTime) : existing.steepTime,
    notes: req.body.notes ?? existing.notes,
    mood: req.body.mood ? JSON.parse(req.body.mood) : existing.mood,
    rating: req.body.rating ? Number(req.body.rating) : existing.rating,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : existing.imageUrl,
    updatedAt: now,
  }

  records[index] = updated
  writeRecords(records)

  res.json(updated)
})

router.delete('/:id', (req: Request, res: Response): void => {
  const records = readRecords()
  const index = records.findIndex((r) => r.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Record not found' })
    return
  }

  const deleted = records.splice(index, 1)[0]
  writeRecords(records)

  res.json(deleted)
})

export default router
