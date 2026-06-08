import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, '../../data/letters.json')

interface LetterPosition {
  x: number
  y: number
}

interface Letter {
  id: string
  content: string
  title: string
  coordinates?: string
  symbols?: string
  envelopeColor: string
  createdAt: string
  parentId: string | null
  replyIds: string[]
  position: LetterPosition
}

function readLetters(): Letter[] {
  const raw = fs.readFileSync(dataPath, 'utf-8')
  return JSON.parse(raw)
}

function writeLetters(letters: Letter[]): void {
  fs.writeFileSync(dataPath, JSON.stringify(letters, null, 2), 'utf-8')
}

function generatePosition(letters: Letter[]): LetterPosition {
  const margin = 0.05
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = margin + Math.random() * (1 - 2 * margin)
    const y = margin + Math.random() * (1 - 2 * margin)
    const tooClose = letters.some(
      (l) => Math.hypot(l.position.x - x, l.position.y - y) < 0.04
    )
    if (!tooClose) return { x, y }
  }
  return { x: Math.random(), y: Math.random() }
}

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const letters = readLetters()
  res.json(letters)
})

router.get('/:id', (req: Request, res: Response) => {
  const letters = readLetters()
  const letter = letters.find((l) => l.id === req.params.id)
  if (!letter) {
    res.status(404).json({ error: 'Letter not found' })
    return
  }
  res.json(letter)
})

router.post('/', (req: Request, res: Response) => {
  const letters = readLetters()
  const { content, title, coordinates, symbols, parentId } = req.body

  if (!content || !title) {
    res.status(400).json({ error: 'Content and title are required' })
    return
  }

  if (content.length > 300) {
    res.status(400).json({ error: 'Content must be 300 characters or less' })
    return
  }

  const gradients = [
    'linear-gradient(135deg, #ff6b9d, #c44dff, #6e2eff)',
    'linear-gradient(135deg, #4dc9f6, #3d7be0, #6e2eff)',
    'linear-gradient(135deg, #ffd700, #ff8c00, #ff4500)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb, #f6d5f7)',
    'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
    'linear-gradient(135deg, #43e97b, #38f9d7, #4facfe)',
    'linear-gradient(135deg, #fa709a, #fee140, #fa709a)',
    'linear-gradient(135deg, #0ba360, #3cba92, #30dd8a)',
    'linear-gradient(135deg, #f5576c, #ff6a00, #ffd200)',
    'linear-gradient(135deg, #7f5af0, #2cb67d, #72f1b8)',
  ]

  const position = parentId
    ? (() => {
        const parent = letters.find((l) => l.id === parentId)
        if (parent) {
          const angle = Math.random() * Math.PI * 2
          return {
            x: Math.min(0.95, Math.max(0.05, parent.position.x + Math.cos(angle) * 0.03)),
            y: Math.min(0.95, Math.max(0.05, parent.position.y + Math.sin(angle) * 0.03)),
          }
        }
        return generatePosition(letters)
      })()
    : generatePosition(letters)

  const newLetter: Letter = {
    id: `star-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    content,
    title,
    coordinates: coordinates || undefined,
    symbols: symbols || undefined,
    envelopeColor: gradients[Math.floor(Math.random() * gradients.length)],
    createdAt: new Date().toISOString(),
    parentId: parentId || null,
    replyIds: [],
    position,
  }

  if (parentId) {
    const parentIdx = letters.findIndex((l) => l.id === parentId)
    if (parentIdx !== -1) {
      letters[parentIdx].replyIds.push(newLetter.id)
    }
  }

  letters.push(newLetter)
  writeLetters(letters)
  res.status(201).json(newLetter)
})

export default router
