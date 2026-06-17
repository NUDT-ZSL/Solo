/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')

const membersFile = path.join(dataDir, 'members.json')
const scoresFile = path.join(dataDir, 'scores.json')

async function readJSON<T>(filePath: string): Promise<T> {
  const data = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(data)
}

async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * GET /api/members - returns all members
 */
app.get('/api/members', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const members = await readJSON<Member[]>(membersFile)
    res.json(members)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/members - creates a new member
 */
app.post('/api/members', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const members = await readJSON<Member[]>(membersFile)
    const newMember: Member = {
      id: uuidv4(),
      name: req.body.name,
      voicePart: req.body.voicePart,
      joinDate: req.body.joinDate,
    }
    members.push(newMember)
    await writeJSON(membersFile, members)
    res.status(201).json(newMember)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/members/:id/scores - returns all score records for a member
 */
app.get('/api/members/:id/scores', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const scores = await readJSON<ScoreRecord[]>(scoresFile)
    const memberScores = scores.filter((s) => s.memberId === req.params.id)
    res.json(memberScores)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/scores - creates a new score record
 */
app.post('/api/scores', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const scores = await readJSON<ScoreRecord[]>(scoresFile)
    const newScore: ScoreRecord = {
      id: uuidv4(),
      memberId: req.body.memberId,
      song: req.body.song,
      date: req.body.date,
      pitch: req.body.pitch,
      rhythm: req.body.rhythm,
      expression: req.body.expression,
    }
    scores.push(newScore)
    await writeJSON(scoresFile, scores)
    res.status(201).json(newScore)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/scores - accepts query params from, to, songs for filtering
 */
app.get('/api/scores', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let scores = await readJSON<ScoreRecord[]>(scoresFile)
    const { from, to, songs } = req.query as { from?: string; to?: string; songs?: string }

    if (from) {
      scores = scores.filter((s) => s.date >= from)
    }
    if (to) {
      scores = scores.filter((s) => s.date <= to)
    }
    if (songs) {
      const songList = songs.split(',').map((s) => s.trim())
      scores = scores.filter((s) => songList.includes(s.song))
    }

    res.json(scores)
  } catch (error) {
    next(error)
  }
})

/**
 * health
 */
app.use(
  '/api/health',
  (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((_error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

interface Member {
  id: string
  name: string
  voicePart: string
  joinDate: string
}

interface ScoreRecord {
  id: string
  memberId: string
  song: string
  date: string
  pitch: number
  rhythm: number
  expression: number
}

export default app
