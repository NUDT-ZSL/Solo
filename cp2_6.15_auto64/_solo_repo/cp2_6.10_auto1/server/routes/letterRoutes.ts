import { Router } from 'express'
import type { Request, Response } from 'express'
import * as letterService from '../services/letterService.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import type { LetterListRes, CreateLetterRes, GetLetterRes } from '../../shared/types.js'

const router = Router()

router.get(
  '/public/:id',
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const result = letterService.getPublicLetter(id)
    res.json({ code: 0, data: result, message: 'ok' })
  }
)

router.post(
  '/',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!
    const result = letterService.createLetter(userId, req.body)
    res.json({ code: 0, data: result, message: 'ok' })
  }
)

router.get(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!
    const { id } = req.params
    const result = letterService.getLetter(userId, id)
    res.json({ code: 0, data: result, message: 'ok' })
  }
)

router.delete(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!
    const { id } = req.params
    letterService.deleteLetter(userId, id)
    res.json({ code: 0, data: null, message: 'ok' })
  }
)

export default router
