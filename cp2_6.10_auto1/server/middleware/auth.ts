import type { Request, Response, NextFunction } from 'express'
import { jsonStore } from '../storage/jsonStore.js'
import { AppError } from './error.js'

export interface AuthRequest extends Request {
  userId?: string
}

export function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('未授权', 401)
  }

  const token = authHeader.slice(7)
  const session = jsonStore.findSessionByToken(token)

  if (!session) {
    throw new AppError('token无效', 401)
  }

  if (Date.now() > session.expiresAt) {
    jsonStore.deleteSessionByToken(token)
    throw new AppError('token已过期', 401)
  }

  const user = jsonStore.findUserById(session.userId)
  if (!user) {
    throw new AppError('用户不存在', 401)
  }

  req.userId = session.userId
  next()
}
