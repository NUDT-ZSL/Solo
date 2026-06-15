import { Router, type Request, type Response } from 'express'
import { createVote, state, getWinnerId } from '../state.js'

export function createVotesRouter(io: { emit: (event: string, data: unknown) => void }) {
  const router = Router()

  router.post('/', (req: Request, res: Response): void => {
    const { title, options, type, duration } = req.body

    if (!title || !Array.isArray(options) || options.length < 2 || !type || !duration) {
      res.status(400).json({ success: false, error: 'Missing required fields: title, options (min 2), type, duration' })
      return
    }

    if (type !== 'single' && type !== 'multiple') {
      res.status(400).json({ success: false, error: 'Type must be "single" or "multiple"' })
      return
    }

    if (typeof duration !== 'number' || duration <= 0) {
      res.status(400).json({ success: false, error: 'Duration must be a positive number in seconds' })
      return
    }

    if (state.currentVote && state.currentVote.active) {
      res.status(409).json({ success: false, error: 'A vote is already active' })
      return
    }

    const optionTexts: string[] = options.map((o: string | { text: string }) =>
      typeof o === 'string' ? o : o.text
    ).filter((t: string) => t.trim())

    if (optionTexts.length < 2) {
      res.status(400).json({ success: false, error: 'At least 2 non-empty options required' })
      return
    }

    const vote = createVote(title, optionTexts, type, duration, (voteId, winnerId) => {
      io.emit('vote_end', { voteId, winnerId })
    })

    io.emit('vote_start', vote)
    res.status(201).json({ success: true, data: vote })
  })

  router.get('/current', (_req: Request, res: Response): void => {
    res.json({ success: true, data: state.currentVote })
  })

  return router
}

export default createVotesRouter
