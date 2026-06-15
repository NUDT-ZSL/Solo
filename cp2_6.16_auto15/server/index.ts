import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseManager } from './db'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = 5000

const db = new DatabaseManager()
;(async () => {
  await db.open()
  await db.init()
})()

app.post('/api/session', async (req: Request, res: Response) => {
  try {
    const { instrument } = req.body
    const sessionId = uuidv4()
    await db.createSession(sessionId, instrument)
    res.json({ sessionId })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' })
  }
})

app.post('/api/ensemble', async (req: Request, res: Response) => {
  try {
    const { sessionId, result } = req.body
    const id = await db.saveEnsembleRecord(
      sessionId,
      result.mode,
      result.totalDuration,
      JSON.stringify(result.instrumentActivity)
    )
    res.json({ success: true, id })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save ensemble record' })
  }
})

app.get('/api/ensemble/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const records = await db.getEnsembleRecords(sessionId)
    res.json({ records })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get ensemble records' })
  }
})

app.listen(PORT, () => console.log('Server on port 5000'))
