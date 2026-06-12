import express from 'express'
import cors from 'cors'
import { initDB, insertScore, getHighScore } from './db'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.post('/api/record', async (req, res) => {
  try {
    const { score, seed } = req.body

    if (typeof score !== 'number' || typeof seed !== 'string') {
      res.status(400).json({ error: 'Invalid input' })
      return
    }

    await insertScore(score, seed)
    const highScore = await getHighScore()

    res.json({
      success: true,
      highScore,
    })
  } catch (error) {
    console.error('Error recording score:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/highscore', async (_req, res) => {
  try {
    const highScore = await getHighScore()
    res.json({ highScore })
  } catch (error) {
    console.error('Error getting high score:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

const startServer = async () => {
  try {
    await initDB()
    console.log('Database initialized')

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
