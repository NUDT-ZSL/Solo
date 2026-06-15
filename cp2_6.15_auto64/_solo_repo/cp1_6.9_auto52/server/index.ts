import express from 'express'
import type { Request, Response } from 'express'
import cors from 'cors'

export interface MoodRecord {
  id: string
  label: string
  emoji: string
  color: string
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'star' | 'heart' | 'wave'
  score: number
  timestamp: number
  note: string
  badgeParams: {
    rotation: number
    size: number
  }
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const moodStore: MoodRecord[] = []

app.get('/api/moods', (_req: Request, res: Response) => {
  res.json(moodStore.sort((a, b) => a.timestamp - b.timestamp))
})

app.post('/api/moods', (req: Request, res: Response) => {
  const body = req.body as Omit<MoodRecord, 'id' | 'timestamp'>
  const record: MoodRecord = {
    ...body,
    id: Math.random().toString(36).slice(2, 11),
    timestamp: Date.now(),
  }
  moodStore.push(record)
  res.json(moodStore.sort((a, b) => a.timestamp - b.timestamp))
})

app.delete('/api/moods/latest', (_req: Request, res: Response) => {
  if (moodStore.length > 0) {
    moodStore.pop()
  }
  res.json(moodStore.sort((a, b) => a.timestamp - b.timestamp))
})

app.listen(PORT, () => {
  console.log(`[Mood Server] running on http://localhost:${PORT}`)
})
