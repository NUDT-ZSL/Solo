import type { Response, NextFunction, Request } from 'express'
import type { AuthRequest } from '../middleware/auth.js'
import * as authService from '../services/authService.js'
import type { RegisterReq, LoginReq, ServerTimeRes } from '../../shared/types.js'

export async function register(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as RegisterReq
  const result = authService.register(body.username, body.password)
  res.json({ code: 0, data: result, message: 'ok' })
}

export async function login(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as LoginReq
  const result = authService.login(body.username, body.password)
  res.json({ code: 0, data: result, message: 'ok' })
}

export async function me(
  req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const userId = req.userId!
  const result = authService.getMe(userId)
  res.json({ code: 0, data: result, message: 'ok' })
}

export async function logout(
  req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization!
  const token = authHeader.slice(7)
  authService.logout(token)
  res.json({ code: 0, data: null, message: 'ok' })
}

export async function serverTime(
  _req: Request,
  res: Response<{ code: number; data: ServerTimeRes; message: string }>,
  _next: NextFunction
): Promise<void> {
  res.json({ code: 0, data: { serverTime: Date.now() }, message: 'ok' })
}
