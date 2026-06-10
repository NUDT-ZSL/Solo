import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../middleware/auth.js'
import * as letterService from '../services/letterService.js'
import type {
  CreateLetterReq,
  CreateLetterRes,
  GetLetterRes,
  LetterListRes,
  ServerTimeRes,
} from '../../shared/types.js'

export async function createLetter(
  req: AuthRequest,
  res: Response<CreateLetterRes>,
  _next: NextFunction
): Promise<void> {
  const userId = req.userId!
  const body = req.body as CreateLetterReq
  const result = letterService.createLetter(userId, body)
  res.status(201).json(result)
}

export async function getLetter(
  req: AuthRequest,
  res: Response<GetLetterRes>,
  _next: NextFunction
): Promise<void> {
  const userId = req.userId!
  const letterId = req.params.id
  const result = letterService.getLetter(userId, letterId)
  res.json(result)
}

export async function listLetters(
  req: AuthRequest,
  res: Response<LetterListRes>,
  _next: NextFunction
): Promise<void> {
  const userId = req.userId!
  const result = letterService.listLetters(userId)
  res.json(result)
}

export async function deleteLetter(
  req: AuthRequest,
  res: Response<{ success: true }>,
  _next: NextFunction
): Promise<void> {
  const userId = req.userId!
  const letterId = req.params.id
  letterService.deleteLetter(userId, letterId)
  res.json({ success: true })
}

export async function serverTime(
  _req: AuthRequest,
  res: Response<ServerTimeRes>,
  _next: NextFunction
): Promise<void> {
  res.json({ serverTime: Date.now() })
}
