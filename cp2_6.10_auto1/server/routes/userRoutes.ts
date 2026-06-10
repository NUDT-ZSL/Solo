import { Router } from 'express'
import type { Response, NextFunction } from 'express'
import * as letterService from '../services/letterService.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import type { LetterListRes } from '../../shared/types.js'

const router = Router()

router.get(
  '/letters',
  authMiddleware,
  async (
    req: AuthRequest,
    res: Response<LetterListRes>,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.userId!
    const result = letterService.listLetters(userId)
    res.json(result)
  }
)

router.get(
  '/stats',
  authMiddleware,
  async (
    req: AuthRequest,
    res: Response<{ total: number; unlocked: number; locked: number }>,
    _next: NextFunction
  ): Promise<void> => {
    const userId = req.userId!
    const result = letterService.getUserStats(userId)
    res.json(result)
  }
)

export default router
