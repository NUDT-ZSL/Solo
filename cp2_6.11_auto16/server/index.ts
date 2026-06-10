import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { analyzeEmotion, type EmotionAnalysisResult, type ColorBlock } from '../src/utils/emotionAnalyzer'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface User {
  id: string
  username: string
  password: string
  dailyGenerations: Record<string, number>
}

interface MoodRecord {
  id: string
  userId: string
  date: string
  text: string
  emotionResult: EmotionAnalysisResult
  drawings: DrawingLine[]
  createdAt: number
  shareId?: string
}

interface DrawingLine {
  id: string
  points: { x: number; y: number }[]
  color: string
  width: number
}

interface ShareLink {
  id: string
  recordId: string
  shortId: string
}

const users: User[] = []
const moodRecords: MoodRecord[] = []
const shareLinks: ShareLink[] = []

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

function generateSampleRecords(userId: string): MoodRecord[] {
  const records: MoodRecord[] = []
  const sampleTexts = [
    '今天心情非常好，阳光明媚，工作也很顺利，感觉整个人都充满了活力和希望。',
    '有点焦虑，明天的面试让我紧张不安，不知道能不能准备好。',
    '今天和朋友聚会很开心，聊了很多有趣的事情，心情愉悦。',
    '有点累，工作压力很大，感觉有点喘不过气来。',
    '收到了一个惊喜的礼物，太开心了！今天是美好的一天。',
    '天气阴沉沉的，心情也有些低落，希望明天会好一点。',
    '今天完成了一个重要项目，很有成就感，感觉自己棒棒的！',
  ]

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = getDateString(date)
    const text = sampleTexts[i % sampleTexts.length]
    const result = analyzeEmotion(text, date.getTime())

    records.push({
      id: uuidv4(),
      userId,
      date: dateStr,
      text,
      emotionResult: result,
      drawings: [],
      createdAt: date.getTime(),
    })
  }

  return records
}

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }

  const existingUser = users.find((u) => u.username === username)
  if (existingUser) {
    return res.status(409).json({ error: '用户名已存在' })
  }

  const user: User = {
    id: uuidv4(),
    username,
    password,
    dailyGenerations: {},
  }

  users.push(user)

  const sampleRecords = generateSampleRecords(user.id)
  moodRecords.push(...sampleRecords)

  res.json({
    userId: user.id,
    username: user.username,
  })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body

  const user = users.find((u) => u.username === username && u.password === password)
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }

  res.json({
    userId: user.id,
    username: user.username,
  })
})

app.get('/api/moods', (req, res) => {
  const userId = req.query.userId as string
  const startDate = req.query.startDate as string
  const endDate = req.query.endDate as string
  const limit = parseInt(req.query.limit as string) || 30

  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' })
  }

  let userRecords = moodRecords
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)

  if (startDate) {
    userRecords = userRecords.filter((r) => r.date >= startDate)
  }
  if (endDate) {
    userRecords = userRecords.filter((r) => r.date <= endDate)
  }

  userRecords = userRecords.slice(0, limit)

  res.json(userRecords)
})

app.get('/api/moods/:id', (req, res) => {
  const { id } = req.params

  const record = moodRecords.find((r) => r.id === id || r.shareId === id)
  if (!record) {
    return res.status(404).json({ error: '记录不存在' })
  }

  res.json(record)
})

app.post('/api/analyze', (req, res) => {
  const { text, userId } = req.body

  if (!text || !userId) {
    return res.status(400).json({ error: '缺少必要参数' })
  }

  const user = users.find((u) => u.id === userId)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  const today = getDateString()
  const todayCount = user.dailyGenerations[today] || 0

  if (todayCount >= 3) {
    return res.status(429).json({ error: '今日配额已用完' })
  }

  const result = analyzeEmotion(text)

  user.dailyGenerations[today] = todayCount + 1

  const existingRecord = moodRecords.find((r) => r.userId === userId && r.date === today)
  if (existingRecord) {
    existingRecord.text = text
    existingRecord.emotionResult = result
    existingRecord.createdAt = Date.now()
    res.json(existingRecord)
  } else {
    const record: MoodRecord = {
      id: uuidv4(),
      userId,
      date: today,
      text,
      emotionResult: result,
      drawings: [],
      createdAt: Date.now(),
    }
    moodRecords.push(record)
    res.json(record)
  }
})

app.put('/api/moods/:id/drawings', (req, res) => {
  const { id } = req.params
  const { drawings } = req.body

  const record = moodRecords.find((r) => r.id === id)
  if (!record) {
    return res.status(404).json({ error: '记录不存在' })
  }

  record.drawings = drawings
  res.json(record)
})

app.post('/api/share/:recordId', (req, res) => {
  const { recordId } = req.params

  const record = moodRecords.find((r) => r.id === recordId)
  if (!record) {
    return res.status(404).json({ error: '记录不存在' })
  }

  const shortId = Math.random().toString(36).substring(2, 10)

  const shareLink: ShareLink = {
    id: uuidv4(),
    recordId,
    shortId,
  }
  shareLinks.push(shareLink)

  record.shareId = shortId

  res.json({
    shareUrl: `/art/${shortId}`,
    shortId,
  })
})

app.get('/api/share/:shortId', (req, res) => {
  const { shortId } = req.params

  const shareLink = shareLinks.find((s) => s.shortId === shortId)
  if (!shareLink) {
    return res.status(404).json({ error: '分享链接不存在' })
  }

  const record = moodRecords.find((r) => r.id === shareLink.recordId)
  if (!record) {
    return res.status(404).json({ error: '记录不存在' })
  }

  res.json({
    record,
    isShared: true,
  })
})

app.get('/api/user/stats', (req, res) => {
  const userId = req.query.userId as string

  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' })
  }

  const user = users.find((u) => u.id === userId)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  const today = getDateString()
  const todayCount = user.dailyGenerations[today] || 0

  res.json({
    dailyRemaining: Math.max(0, 3 - todayCount),
    todayCount,
    maxPerDay: 3,
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export default app
