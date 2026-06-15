import { Router, type Request, type Response } from 'express'
import { getAllAromas } from '../database.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const aromas = getAllAromas()
    res.json(aromas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch aromas' })
  }
})

export default router
