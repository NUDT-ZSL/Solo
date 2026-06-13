import { Router, Request, Response } from 'express'
import {
  registerUser,
  loginUser,
  getUserPreferences,
  getUserByToken,
  updateUserPreferences
} from '../models/userStore.js'

const router = Router()

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return null
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, preferences } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码不能为空' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: '密码长度不少于8位' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' })
    }

    const user = await registerUser(username, email, password, preferences || [])
    if (!user) {
      return res.status(409).json({ error: '用户名或邮箱已存在' })
    }

    res.status(201).json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '注册失败' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' })
    }

    const user = await loginUser(email, password)
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    res.json(user)
  } catch (err) {
    res.status(500).json({ error: '登录失败' })
  }
})

router.get('/:id/preferences', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const preferences = await getUserPreferences(id)
    if (preferences === null) {
      return res.status(404).json({ error: '用户不存在' })
    }
    res.json({ preferences })
  } catch (err) {
    res.status(500).json({ error: '获取用户偏好失败' })
  }
})

router.put('/:id/preferences', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { preferences } = req.body

    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: '偏好必须是数组' })
    }

    const success = await updateUserPreferences(id, preferences)
    if (!success) {
      return res.status(404).json({ error: '用户不存在' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: '更新偏好失败' })
  }
})

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = extractToken(req)
    if (!token) {
      return res.status(401).json({ error: '未登录' })
    }
    const user = await getUserByToken(token)
    if (!user) {
      return res.status(401).json({ error: '无效的token' })
    }
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

export default router
