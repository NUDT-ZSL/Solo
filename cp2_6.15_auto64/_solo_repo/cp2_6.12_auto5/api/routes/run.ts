import { Router, type Request, type Response } from 'express'
import { checkRateLimit, cleanupOldRateLimits } from '../store.js'
import { runInSandbox } from '../sandbox.js'
import type { SnippetLanguage } from '../store.js'

const router = Router()

interface RunCodeBody {
  code: string
  language: SnippetLanguage
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'

  cleanupOldRateLimits()

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Rate limit exceeded. Maximum 5 requests per minute.' })
    return
  }

  const { code, language } = req.body as RunCodeBody

  if (!code || !language) {
    res.status(400).json({ error: 'Code and language are required' })
    return
  }

  if (language !== 'javascript' && language !== 'python') {
    res.status(400).json({ error: 'Language must be javascript or python' })
    return
  }

  const result = await runInSandbox(code, language)

  res.json({
    output: result.output,
    error: result.error,
    timedOut: result.timedOut,
  })
})

export default router
