import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

const users = [
  { id: 'm1', username: '张三', role: 'manager' as const, points: 320, avatar: '👨‍🌾' },
  { id: 'm2', username: '李四', role: 'member' as const, points: 180, avatar: '👩‍🌾' },
  { id: 'm3', username: '王五', role: 'member' as const, points: 250, avatar: '🧑‍🌾' },
  { id: 'm4', username: '赵六', role: 'member' as const, points: 140, avatar: '👨‍🍳' },
]

router.post('/login', (req: Request, res: Response): void => {
  const { username, role } = req.body
  if (!username || !role) {
    res.status(400).json({ success: false, error: '缺少 username 或 role' })
    return
  }

  const matched = users.find((u) => u.username === username && u.role === role)
  const user = matched ?? {
    id: uuidv4(),
    username,
    role,
    points: 0,
    avatar: '🌱',
  }

  const token = `token-${uuidv4()}`
  res.json({ token, user })
})

export default router
