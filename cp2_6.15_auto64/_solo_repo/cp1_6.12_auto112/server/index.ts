import express from 'express'
import Datastore from 'nedb-promises'
import { v4 as uuidv4 } from 'uuid'
import { analyzeRepo, AnalyzeResult } from './analyzer.js'

const app = express()
const PORT = 4000

app.use(express.json())

const db = Datastore.create('./data/analysis.db')

app.post('/repo/analyze', async (req, res) => {
  try {
    const { repoUrl } = req.body

    if (!repoUrl || typeof repoUrl !== 'string') {
      res.status(400).json({ error: 'repoUrl is required' })
      return
    }

    const result: AnalyzeResult = analyzeRepo(repoUrl)

    const record = {
      _id: uuidv4(),
      ...result,
      createdAt: new Date().toISOString()
    }

    await db.insert(record)

    res.json(result)
  } catch (error) {
    console.error('Analysis error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/analysis/history', async (_req, res) => {
  try {
    const records = await db.find({}).sort({ createdAt: -1 }).limit(10)
    res.json(records)
  } catch (error) {
    console.error('History error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
