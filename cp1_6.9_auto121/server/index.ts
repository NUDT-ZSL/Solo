import express from 'express'
import cors from 'cors'
import type { Request, Response } from 'express'

interface PaletteColor {
  hex: string
  emotion: string
}

interface Palette {
  id: string
  name: string
  tags: string[]
  colors: PaletteColor[]
  emotion: string
  createdAt: number
  feedbacks: Feedback[]
}

interface Feedback {
  id: string
  color: string
  createdAt: number
}

const app = express()
app.use(cors())
app.use(express.json())

const palettes = new Map<string, Palette>()

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

app.post('/api/palettes', (req: Request, res: Response) => {
  const { name, tags, colors, emotion } = req.body

  if (!name || !colors || colors.length < 3 || colors.length > 12) {
    return res.status(400).json({
      error: colors.length < 3 
        ? '至少需要3种颜色才能形成情绪的完整拼图' 
        : '调色板最多只能包含12种颜色'
    })
  }

  const id = generateId()
  const palette: Palette = {
    id,
    name,
    tags: tags || [],
    colors,
    emotion: emotion || '平静',
    createdAt: Date.now(),
    feedbacks: []
  }

  palettes.set(id, palette)
  return res.status(201).json({ id, palette })
})

app.get('/api/palettes', (_req: Request, res: Response) => {
  const list = Array.from(palettes.values()).sort((a, b) => b.createdAt - a.createdAt)
  return res.json(list)
})

app.get('/api/palettes/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const palette = palettes.get(id)

  if (!palette) {
    return res.status(404).json({ error: '调色板不存在' })
  }

  return res.json(palette)
})

app.post('/api/palettes/:id/feedback', (req: Request, res: Response) => {
  const { id } = req.params
  const { color } = req.body
  const palette = palettes.get(id)

  if (!palette) {
    return res.status(404).json({ error: '调色板不存在' })
  }

  if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return res.status(400).json({ error: '无效的颜色值' })
  }

  const feedback: Feedback = {
    id: generateId(),
    color,
    createdAt: Date.now()
  }

  palette.feedbacks.push(feedback)
  return res.status(201).json(feedback)
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`🎨 情绪调色板后端服务已启动: http://localhost:${PORT}`)
})

export default app
