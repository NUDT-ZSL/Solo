import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import cors from 'cors'

const app = express()
type Request = express.Request
type Response = express.Response
const PORT = 3001

app.use(cors())
app.use(express.json())

interface MemoryRecord {
  id: string
  text: string
  timestamp: number
  sentimentScore: number
  color: string
  size: number
  brightness: number
}

const POSITIVE_WORDS = ['快乐', '感动', '温暖', '期待', '希望', '惊喜', '开心', '幸福', '美好', '愉快', '喜悦', '满足', '感激', '热爱', '振奋']
const NEGATIVE_WORDS = ['难过', '愤怒', '失望', '焦虑', '孤独', '沮丧', '悲伤', '痛苦', '疲惫', '担忧', '恐惧', '委屈', '失落', '烦躁', '绝望']

let records: MemoryRecord[] = []

function analyzeSentiment(text: string): number {
  let score = 0
  for (const word of POSITIVE_WORDS) {
    const regex = new RegExp(word, 'g')
    const matches = text.match(regex)
    if (matches) {
      score += matches.length * 2
    }
  }
  for (const word of NEGATIVE_WORDS) {
    const regex = new RegExp(word, 'g')
    const matches = text.match(regex)
    if (matches) {
      score -= matches.length * 2
    }
  }
  return Math.max(-10, Math.min(10, score))
}

function getColor(score: number): string {
  if (score > 0) {
    const t = score / 10
    const r1 = 255, g1 = 140, b1 = 0
    const r2 = 255, g2 = 69, b2 = 0
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    return `rgb(${r},${g},${b})`
  } else if (score < 0) {
    const t = Math.abs(score) / 10
    const r1 = 75, g1 = 0, b1 = 130
    const r2 = 138, g2 = 43, b2 = 226
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    return `rgb(${r},${g},${b})`
  }
  return '#DDA0DD'
}

function getSize(text: string): number {
  const len = text.length
  return Math.max(20, Math.min(50, 20 + (len / 500) * 30))
}

function getBrightness(score: number): number {
  const absScore = Math.abs(score)
  return 0.3 + (absScore / 10) * 0.7
}

function generateMockData(): MemoryRecord[] {
  const mockTexts = [
    { text: '今天和朋友一起看了一场精彩的电影，真的很快乐，满满的感动。', score: 8 },
    { text: '工作上遇到了一些挫折，感觉有点沮丧和失望。', score: -7 },
    { text: '午后的阳光洒进窗台，温暖而惬意。', score: 6 },
    { text: '独自一人走在回家的路上，感到些许孤独。', score: -5 },
    { text: '收到了一份意外的礼物，真是惊喜万分！', score: 9 },
    { text: '明天要面试了，心里有些焦虑和担忧。', score: -6 },
    { text: '喝到了一杯很好喝的咖啡，心情愉快。', score: 5 },
    { text: '项目终于完成了，充满了成就感和希望。', score: 7 },
    { text: '今天的天气阴沉沉的，让人感到有些疲惫。', score: -4 },
    { text: '读了一本好书，内心平静而满足。', score: 6 }
  ]

  const now = Date.now()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  return mockTexts.map((item, index) => {
    const timestamp = now - Math.floor(Math.random() * sevenDays)
    const text = item.text
    const sentimentScore = item.score
    const color = getColor(sentimentScore)
    const size = getSize(text)
    const brightness = getBrightness(sentimentScore)

    return {
      id: uuidv4(),
      text,
      timestamp: timestamp + index * 1000,
      sentimentScore,
      color,
      size,
      brightness
    }
  }).sort((a, b) => a.timestamp - b.timestamp)
}

function initMockDataIfEmpty() {
  if (records.length === 0) {
    records = generateMockData()
  }
}

app.get('/api/records', (_req: Request, res: Response) => {
  initMockDataIfEmpty()
  res.json(records)
})

app.post('/api/records', (req: Request, res: Response) => {
  const { text } = req.body

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: '文本内容不能为空' })
  }

  if (text.length > 500) {
    return res.status(400).json({ error: '文本内容不能超过500字' })
  }

  const sentimentScore = analyzeSentiment(text)
  const newRecord: MemoryRecord = {
    id: uuidv4(),
    text,
    timestamp: Date.now(),
    sentimentScore,
    color: getColor(sentimentScore),
    size: getSize(text),
    brightness: getBrightness(sentimentScore)
  }

  records.push(newRecord)
  records.sort((a, b) => a.timestamp - b.timestamp)

  res.status(201).json(newRecord)
})

app.listen(PORT, () => {
  console.log(`回忆星图服务器已启动: http://localhost:${PORT}`)
  initMockDataIfEmpty()
})
