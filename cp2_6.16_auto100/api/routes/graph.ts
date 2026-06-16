import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

interface Card {
  id: string
  name: string
  category: string
  shortDef: string
  detail: string
  relatedIds: string[]
  quizQuestion: string
  quizAnswer: string
  quizExplanation: string
}

interface Connection {
  source: string
  target: string
}

interface LearningRecord {
  learned: Set<string>
  correctCount: number
  totalCount: number
}

function readCards(): Card[] {
  const data = fs.readFileSync(path.join(__dirname, '..', 'data', 'cards.json'), 'utf-8')
  return JSON.parse(data)
}

function readConnections(): Connection[] {
  const data = fs.readFileSync(path.join(__dirname, '..', 'data', 'connections.json'), 'utf-8')
  return JSON.parse(data)
}

const learningRecord: LearningRecord = {
  learned: new Set<string>(),
  correctCount: 0,
  totalCount: 0,
}

router.get('/graph', (_req: Request, res: Response) => {
  try {
    const cards = readCards()
    const connections = readConnections()
    const nodes = cards.map((card) => ({
      id: card.id,
      name: card.name,
      category: card.category,
    }))
    res.json({ nodes, edges: connections })
  } catch (error) {
    res.status(500).json({ error: 'Failed to read graph data' })
  }
})

router.get('/card/:id', (req: Request, res: Response) => {
  try {
    const cards = readCards()
    const card = cards.find((c) => c.id === req.params.id)
    if (!card) {
      res.status(404).json({ error: 'Card not found' })
      return
    }
    res.json(card)
  } catch (error) {
    res.status(500).json({ error: 'Failed to read card data' })
  }
})

router.get('/quiz', (_req: Request, res: Response) => {
  try {
    const cards = readCards()
    const randomCard = cards[Math.floor(Math.random() * cards.length)]
    res.json({
      cardId: randomCard.id,
      question: randomCard.quizQuestion,
      hint: randomCard.shortDef,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate quiz' })
  }
})

router.post('/answer', (req: Request, res: Response) => {
  try {
    const { cardId, answer } = req.body as { cardId: string; answer: string }
    if (!cardId || !answer) {
      res.status(400).json({ error: 'cardId and answer are required' })
      return
    }
    const cards = readCards()
    const card = cards.find((c) => c.id === cardId)
    if (!card) {
      res.status(404).json({ error: 'Card not found' })
      return
    }
    const isCorrect = card.quizAnswer.toLowerCase().includes(answer.trim().toLowerCase())
    learningRecord.learned.add(cardId)
    learningRecord.totalCount++
    if (isCorrect) {
      learningRecord.correctCount++
    }
    res.json({
      correct: isCorrect,
      correctAnswer: card.quizAnswer,
      explanation: card.quizExplanation,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify answer' })
  }
})

router.get('/progress', (_req: Request, res: Response) => {
  try {
    const cards = readCards()
    res.json({
      totalCards: cards.length,
      learnedCards: learningRecord.learned.size,
      correctRate: learningRecord.totalCount > 0
        ? Math.round((learningRecord.correctCount / learningRecord.totalCount) * 100)
        : 0,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to read progress' })
  }
})

export default router
