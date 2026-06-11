import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface CardBehavior {
  id: string
  clicks: number
  hoverSeconds: number
}

interface BehaviorData {
  cards: CardBehavior[]
  scrollDepth: number
  sessionId: string
}

interface CardLayout {
  id: string
  score: number
  gridWeight: number
  backgroundColor: string
  textColor: string
  glowColor: string
  scoreLevel: 'high' | 'medium' | 'low'
}

interface LayoutResponse {
  cards: CardLayout[]
  timestamp: number
}

function calculateScore(clicks: number, hoverSeconds: number, scrollDepth: number): number {
  return clicks * 2 + hoverSeconds + scrollDepth * 0.5
}

function getScoreLevel(score: number, maxScore: number): 'high' | 'medium' | 'low' {
  const ratio = maxScore > 0 ? score / maxScore : 0.25
  if (ratio >= 0.6) return 'high'
  if (ratio >= 0.3) return 'medium'
  return 'low'
}

function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex = (x: string) => parseInt(x, 16)
  const r1 = hex(color1.slice(1, 3))
  const g1 = hex(color1.slice(3, 5))
  const b1 = hex(color1.slice(5, 7))
  const r2 = hex(color2.slice(1, 3))
  const g2 = hex(color2.slice(3, 5))
  const b2 = hex(color2.slice(5, 7))
  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)
  return `rgb(${r}, ${g}, ${b})`
}

function getGlowColor(scoreLevel: 'high' | 'medium' | 'low'): string {
  switch (scoreLevel) {
    case 'high':
      return 'rgba(76, 175, 80, 0.6)'
    case 'medium':
      return 'rgba(255, 193, 7, 0.6)'
    case 'low':
      return 'rgba(244, 67, 54, 0.6)'
  }
}

app.post('/api/behavior', (req, res) => {
  try {
    const { cards, scrollDepth }: BehaviorData = req.body

    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Invalid cards data' })
    }

    const scores = cards.map((card) => ({
      id: card.id,
      score: calculateScore(card.clicks, card.hoverSeconds, scrollDepth),
    }))

    const maxScore = Math.max(...scores.map((s) => s.score), 1)
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0) || 4

    const layouts: CardLayout[] = scores.map(({ id, score }) => {
      const scoreRatio = score / totalScore
      const gridWeight = Math.max(0.5, scoreRatio * 4)
      const brightnessRatio = Math.min(1, Math.max(0, score / maxScore))

      const backgroundColor = interpolateColor('#f0f0f0', '#ffffff', brightnessRatio)
      const textColor = interpolateColor('#666666', '#111111', brightnessRatio)
      const scoreLevel = getScoreLevel(score, maxScore)
      const glowColor = getGlowColor(scoreLevel)

      return {
        id,
        score,
        gridWeight,
        backgroundColor,
        textColor,
        glowColor,
        scoreLevel,
      }
    })

    const response: LayoutResponse = {
      cards: layouts,
      timestamp: Date.now(),
    }

    res.json(response)
  } catch (error) {
    console.error('Error processing behavior data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`POST /api/behavior - receive behavior data`)
  console.log(`GET  /api/health   - health check`)
})
