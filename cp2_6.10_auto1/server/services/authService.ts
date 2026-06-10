import { jsonStore } from '../storage/jsonStore.js'
import { generateId, generateToken } from '../utils/id.js'
import { hashPassword, verifyPassword } from '../utils/hash.js'
import { AppError } from '../middleware/error.js'
import type { User, Session, AuthRes } from '../../shared/types.js'

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000

export function register(username: string, password: string): AuthRes {
  if (!username || username.length < 3) {
    throw new AppError('用户名至少3个字符')
  }
  if (!password || password.length < 6) {
    throw new AppError('密码至少6个字符')
  }

  const existing = jsonStore.findUserByUsername(username)
  if (existing) {
    throw new AppError('用户名已存在')
  }

  const user: User = {
    id: generateId(),
    username,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  }
  jsonStore.createUser(user)

  const token = generateToken()
  const session: Session = {
    id: generateId(),
    userId: user.id,
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL,
  }
  jsonStore.createSession(session)

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  }
}

export function login(username: string, password: string): AuthRes {
  const user = jsonStore.findUserByUsername(username)
  if (!user) {
    throw new AppError('用户名或密码错误', 401)
  }

  if (!verifyPassword(password, user.passwordHash)) {
    throw new AppError('用户名或密码错误', 401)
  }

  const token = generateToken()
  const session: Session = {
    id: generateId(),
    userId: user.id,
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL,
  }
  jsonStore.createSession(session)

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  }
}

export function getMe(userId: string): { id: string; username: string } {
  const user = jsonStore.findUserById(userId)
  if (!user) {
    throw new AppError('用户不存在', 404)
  }
  return {
    id: user.id,
    username: user.username,
  }
}

export function logout(token: string): void {
  jsonStore.deleteSessionByToken(token)
}
