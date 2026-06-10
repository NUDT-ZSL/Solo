import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../middleware/auth.js'
import * as authService from '../services/authService.js'
import type { RegisterReq, LoginReq, AuthRes, ServerTimeRes } from '../../shared/types.js'

export async function register(
  req: AuthRequest,
  res: Response<AuthRes>,
  _next: NextFunction
): Promise<void> {
  const body = req.body as RegisterReq
  const result = authService.register(body.username, body.password)
  res.json(result)
}

export async function login(
  req: AuthRequest,
  res: Response<AuthRes>,
  _next: NextFunction
): Promise<void> {
  const body = req.body as LoginReq
  const result = authService.login(body.username, body.password)
  res.json(result)
}

export async function me(
  req: AuthRequest,
  res: Response<{ id: string; username: string }>,
  _next: NextFunction
): Promise<void> {
  const userId = req.userId!
  const result = authService.getMe(userId)
  res.json(result)
}

export async function logout(
  req: AuthRequest,
  res: Response<{ success: true }>,
  _next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization!
  const token = authHeader.slice(7)
  authService.logout(token)
  res.json({ success: true })
}

export async function serverTime(
  _req: AuthRequest,
  res: Response<ServerTimeRes>,
  _next: NextFunction
): Promise<void> {
  res.json({ serverTime: Date.now() })
}
