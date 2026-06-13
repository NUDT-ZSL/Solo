import { Router, Request, Response } from 'express'
import {
  registerUser,
  loginUser,
  getUserPreferences,
  getUserByToken,
  updateUserPreferences,
  addUserHistory,
  getUserFullData
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
    const { username, email, password, preference_tags } = req.body

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

    if (preference_tags !== undefined && !Array.isArray(preference_tags)) {
      return res.status(400).json({ error: '偏好必须是字符串数组' })
    }

    const user = await registerUser(
      String(username).trim(),
      String(email).trim().toLowerCase(),
      String(password),
      preference_tags || []
    )

    if (!user) {
      return res.status(409).json({ error: '用户名或邮箱已存在' })
    }

    res.status(201).json(user)
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: '注册失败' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' })
    }

    const user = await loginUser(String(email).trim().toLowerCase(), String(password))
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    res.json(user)
  } catch (err) {
    console.error('Login error:', err)
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
    res.json({ preference_tags: preferences })
  } catch (err) {
    console.error('Get preferences error:', err)
    res.status(500).json({ error: '获取用户偏好失败' })
  }
})

router.put('/:id/preferences', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { preference_tags } = req.body

    if (!Array.isArray(preference_tags)) {
      return res.status(400).json({ error: '偏好必须是字符串数组' })
    }

    const success = await updateUserPreferences(id, preference_tags)
    if (!success) {
      return res.status(404).json({ error: '用户不存在' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Update preferences error:', err)
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
    console.error('Get me error:', err)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

router.get('/:id/profile', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const user = await getUserFullData(id)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      preference_tags: user.preference_tags,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      liked_recipes_count: user.liked_recipes?.length || 0,
      uploaded_recipes_count: user.uploaded_recipes?.length || 0,
      history_count: user.history?.length || 0
    })
  } catch (err) {
    console.error('Get profile error:', err)
    res.status(500).json({ error: '获取用户档案失败' })
  }
})

router.post('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { recipe_id, action } = req.body

    if (!recipe_id || !action) {
      return res.status(400).json({ error: '缺少recipe_id或action' })
    }

    const validActions = ['view', 'like', 'upload']
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `action必须是${validActions.join('/')}` })
    }

    const success = await addUserHistory(id, recipe_id, action)
    if (!success) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Add history error:', err)
    res.status(500).json({ error: '记录历史失败' })
  }
})

export default router
