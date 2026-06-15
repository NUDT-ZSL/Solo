import express, { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { Diary, EmotionType, analyzeEmotion } from './shared'

const app = express()
const PORT = 3001

app.use(express.json())

app.use((_req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

const diaryStore = new Map<string, Diary[]>()

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
}

function sortDiaries(diaries: Diary[]): Diary[] {
  return [...diaries].sort((a, b) => b.createdAt - a.createdAt)
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', storedUsers: diaryStore.size })
})

app.get('/capsule/:uuid', (req: Request, res: Response) => {
  const { uuid } = req.params
  const diaries = diaryStore.get(uuid) || []
  res.json({
    uuid,
    diaries: sortDiaries(diaries),
    count: diaries.length,
  })
})

interface SaveDiaryRequest {
  uuid?: string
  content: string
  weather: string
  mood: number
}

app.post('/save', (req: Request<{}, {}, SaveDiaryRequest>, res: Response) => {
  try {
    const { content, weather, mood } = req.body
    let { uuid } = req.body

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: '日记内容不能为空' })
      return
    }

    if (content.length > 500) {
      res.status(400).json({ error: '日记内容不能超过500字' })
      return
    }

    if (!uuid) {
      uuid = uuidv4()
    }

    const emotionResult = analyzeEmotion(content)

    const newDiary: Diary = {
      id: uuidv4(),
      uuid: uuid!,
      content: content.trim(),
      date: formatDate(new Date()),
      weather: weather || '☀️',
      mood: Math.max(1, Math.min(5, mood || 3)),
      emotions: emotionResult.emotions as Record<EmotionType, number>,
      primaryEmotion: emotionResult.primaryEmotion as EmotionType,
      hue: emotionResult.hue,
      saturation: emotionResult.saturation,
      lightness: emotionResult.lightness,
      intensity: emotionResult.intensity,
      createdAt: Date.now(),
    }

    const existing = diaryStore.get(uuid!) || []
    existing.push(newDiary)
    diaryStore.set(uuid!, existing)

    res.json({
      uuid,
      saved: true,
      diary: newDiary,
      diaries: sortDiaries(existing),
      shareUrl: `/capsule/${uuid}`,
    })
  } catch (err) {
    console.error('Save error:', err)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(200)
})

app.listen(PORT, () => {
  console.log(`🚀 情绪胶囊服务运行于 http://localhost:${PORT}`)
})
