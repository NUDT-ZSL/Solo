import express from 'express'
import cors from 'cors'
import { initDB, getAllCards, getCardById } from './cards'
import { simulateBattle, generateEnemyDeck } from './battle'
import type { CardType } from '../shared/types'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

initDB()

app.get('/api/cards', (req, res) => {
  const type = req.query.type as CardType | undefined
  const valid = ['attack', 'defense', 'spell', 'summon', undefined]
  if (!valid.includes(type)) return res.status(400).json({ error: 'Invalid type' })
  res.json(getAllCards(type))
})

app.get('/api/cards/:id', (req, res) => {
  const card = getCardById(req.params.id)
  if (!card) return res.status(404).json({ error: 'Card not found' })
  res.json(card)
})

app.post('/api/battle', (req, res) => {
  const { playerDeck, enemyLevel } = req.body
  if (!Array.isArray(playerDeck) || playerDeck.length === 0) {
    return res.status(400).json({ error: 'playerDeck must be a non-empty array' })
  }
  if (enemyLevel !== undefined && ![1, 2, 3].includes(enemyLevel)) {
    return res.status(400).json({ error: 'enemyLevel must be 1, 2 or 3' })
  }
  try {
    const result = simulateBattle({ playerDeck, enemyLevel })
    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Battle simulation failed' })
  }
})

app.get('/api/enemy-deck', (req, res) => {
  const level = Number(req.query.level) || 1
  const lvl = Math.max(1, Math.min(3, level)) as 1 | 2 | 3
  res.json(generateEnemyDeck(lvl))
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`[server] Card battle API running on http://localhost:${PORT}`)
})
