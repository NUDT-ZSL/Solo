import { Router } from 'express'
import type { Response } from 'express'
import * as letterService from '../services/letterService.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import type { LetterListRes, UserStatsRes } from '../../shared/types.js'

const router = Router()

router.get(
  '/letters',
  authMiddleware,
  async (
    req: AuthRequest,
    res: Response<{ code: number; data: LetterListRes; message: string }>,
  ): Promise<void> => {
    const userId = req.userId!
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const result = letterService.listLetters(userId, page, pageSize)
    res.json({ code: 0, data: result, message: 'ok' })
  }
)

router.get(
  '/stats',
  authMiddleware,
  async (
    req: AuthRequest,
    res: Response<{ code: number; data: UserStatsRes; message: string }>,
  ): Promise<void> => {
    const userId = req.userId!
    const result = letterService.getUserStats(userId)
    res.json({ code: 0, data: result, message: 'ok' })
  }
)

export default router
