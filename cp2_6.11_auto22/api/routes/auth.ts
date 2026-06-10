import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { users } from '../store.js'
import crypto from 'crypto'

const router = Router()
const SALT_ROUNDS = 10
const TOKEN_SECRET = 'voiceprint-album-secret-2024'

function generateToken(userId: string, email: string): string {
  const payload = JSON.stringify({ userId, email, ts: Date.now() })
  const iv = crypto.randomBytes(16).toString('hex')
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload + iv)
    .digest('hex')
    .slice(0, 32)
  return Buffer.from(JSON.stringify({ payload, iv, signature })).toString('base64')
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: '邮箱和密码不能为空' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ error: '密码至少需要6个字符' })
    return
  }

  const existing = users.findByEmail(email)
  if (existing) {
    res.status(409).json({ error: '该邮箱已注册' })
    return
  }

  const id = uuidv4()
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
  const user = { id, email, password: hashedPassword }
  users.set(id, user)

  const token = generateToken(id, email)

  res.status(201).json({ user: { id, email }, token })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: '邮箱和密码不能为空' })
    return
  }

  const foundUser = users.findByEmail(email)
  if (!foundUser) {
    res.status(401).json({ error: '邮箱或密码错误' })
    return
  }

  const isMatch = await bcrypt.compare(password, foundUser.password)
  if (!isMatch) {
    res.status(401).json({ error: '邮箱或密码错误' })
    return
  }

  const token = generateToken(foundUser.id, foundUser.email)

  res.json({ user: { id: foundUser.id, email: foundUser.email }, token })
})

export default router
