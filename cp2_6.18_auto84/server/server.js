import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3456
const DATA_DIR = path.join(__dirname, 'data')
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json')
const SCORES_FILE = path.join(DATA_DIR, 'scores.json')

app.use(cors())
app.use(express.json({ limit: '10mb' }))

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf-8')
  try {
    return JSON.parse(content)
  } catch {
    return []
  }
}

function writeJSON(filePath, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/api/members', (_req, res) => {
  const members = readJSON(MEMBERS_FILE)
  res.json({ data: members })
})

app.get('/api/members/:id/scores', (req, res) => {
  const { id } = req.params
  const scores = readJSON(SCORES_FILE)
  const memberScores = scores.filter(s => s.memberId === id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  res.json({ data: memberScores })
})

app.get('/api/scores', (_req, res) => {
  const scores = readJSON(SCORES_FILE)
  res.json({ data: scores })
})

app.post('/api/scores', (req, res) => {
  const { memberId, pitch, rhythm, expression, note, audioUrl, songs } = req.body
  if (!memberId || pitch === undefined || rhythm === undefined || expression === undefined) {
    return res.status(400).json({ error: '缺少必要字段' })
  }
  const scores = readJSON(SCORES_FILE)
  const newRecord = {
    id: uuidv4(),
    memberId,
    date: new Date().toISOString().split('T')[0],
    pitch: Number(pitch),
    rhythm: Number(rhythm),
    expression: Number(expression),
    note: note || '',
    audioUrl: audioUrl || '',
    songs: songs || []
  }
  scores.push(newRecord)
  writeJSON(SCORES_FILE, scores)
  res.json({ data: newRecord })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  if (!fs.existsSync(MEMBERS_FILE)) {
    const initialMembers = [
      { id: uuidv4(), name: '张明', voicePart: '女高音', joinDate: '2024-03-15' },
      { id: uuidv4(), name: '李华', voicePart: '女低音', joinDate: '2024-03-20' },
      { id: uuidv4(), name: '王强', voicePart: '男高音', joinDate: '2024-04-01' },
      { id: uuidv4(), name: '赵芳', voicePart: '女高音', joinDate: '2024-04-10' },
      { id: uuidv4(), name: '陈伟', voicePart: '男低音', joinDate: '2024-05-01' }
    ]
    writeJSON(MEMBERS_FILE, initialMembers)
    console.log('初始化团员数据完成')
  }
  if (!fs.existsSync(SCORES_FILE)) {
    writeJSON(SCORES_FILE, [])
    console.log('初始化评分数据完成')
  }
})
