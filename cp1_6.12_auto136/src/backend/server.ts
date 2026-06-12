import express, { Request, Response } from 'express'
import { LevelManager, ScoreEntry } from './LevelManager'

const app = express()
const PORT = 3001
const levelManager = new LevelManager()

app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

app.get('/api/levels', async (req: Request, res: Response) => {
  try {
    const levels = await levelManager.getLevels()
    res.json({ success: true, data: levels })
  } catch (error) {
    console.error('Error fetching levels:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch levels' })
  }
})

app.get('/api/levels/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const level = await levelManager.getLevelById(id)
    if (!level) {
      res.status(404).json({ success: false, error: 'Level not found' })
      return
    }
    res.json({ success: true, data: level })
  } catch (error) {
    console.error('Error fetching level:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch level' })
  }
})

app.get('/api/scores', async (req: Request, res: Response) => {
  try {
    const { levelId, limit } = req.query
    const limitNum = limit ? parseInt(limit as string, 10) : 10
    const scores = await levelManager.getTopScores(limitNum, levelId as string)
    res.json({ success: true, data: scores })
  } catch (error) {
    console.error('Error fetching scores:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch scores' })
  }
})

app.post('/api/scores', async (req: Request, res: Response) => {
  try {
    const { playerName, score, levelId, levelName, maxCombo, obstaclesCleared } = req.body

    if (!playerName || typeof score !== 'number' || !levelId) {
      res.status(400).json({ success: false, error: 'Missing required fields' })
      return
    }

    const entry: ScoreEntry = await levelManager.addScore(
      playerName,
      score,
      levelId,
      levelName,
      maxCombo,
      obstaclesCleared
    )

    const rank = await levelManager.checkRank(score, levelId)

    res.json({ success: true, data: { entry, rank } })
  } catch (error) {
    console.error('Error saving score:', error)
    res.status(500).json({ success: false, error: 'Failed to save score' })
  }
})

app.get('/api/scores/check-rank', async (req: Request, res: Response) => {
  try {
    const { score, levelId } = req.query
    if (typeof score !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid score' })
      return
    }
    const rank = await levelManager.checkRank(parseInt(score, 10), levelId as string)
    res.json({ success: true, data: { rank, isTop10: rank <= 10 } })
  } catch (error) {
    console.error('Error checking rank:', error)
    res.status(500).json({ success: false, error: 'Failed to check rank' })
  }
})

const startServer = async () => {
  await levelManager.init()
  app.listen(PORT, () => {
    console.log(`EchoDodge server running on port ${PORT}`)
    console.log(`API endpoints:`)
    console.log(`  GET  /api/levels`)
    console.log(`  GET  /api/levels/:id`)
    console.log(`  GET  /api/scores`)
    console.log(`  POST /api/scores`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

export default app
