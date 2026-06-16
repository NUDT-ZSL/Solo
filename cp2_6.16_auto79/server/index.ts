import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const WORKSHOPS_FILE = path.join(DATA_DIR, 'workshops.json')

type Skill = { level: number; exp: number }
type SkillCategory = 'carpentry' | 'pottery' | 'weaving' | 'embroidery' | 'leathercraft' | 'papercraft'

type User = {
  id: string
  username: string
  email: string
  password: string
  registeredWorkshops: string[]
  attendedWorkshops: string[]
  skills: Record<string, Skill>
}

type Submission = {
  userId: string
  photo: string
}

type Workshop = {
  id: string
  title: string
  date: string
  location: string
  maxParticipants: number
  materials: string[]
  participants: string[]
  hostId: string
  category: SkillCategory
  submissions: Submission[]
}

const SKILL_CATEGORIES: SkillCategory[] = ['carpentry', 'pottery', 'weaving', 'embroidery', 'leathercraft', 'papercraft']

const EXP_PER_REGISTER = 50
const EXP_PER_LEVEL = 100

let users: User[] = []
let workshops: Workshop[] = []

function loadData(): void {
  try {
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
    }
    if (fs.existsSync(WORKSHOPS_FILE)) {
      workshops = JSON.parse(fs.readFileSync(WORKSHOPS_FILE, 'utf-8'))
    }
    console.log(`Loaded ${users.length} users and ${workshops.length} workshops`)
  } catch (err) {
    console.error('Error loading data:', err)
    users = []
    workshops = []
  }
}

function saveUsers(): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error saving users:', err)
  }
}

function saveWorkshops(): void {
  try {
    fs.writeFileSync(WORKSHOPS_FILE, JSON.stringify(workshops, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error saving workshops:', err)
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function addSkillExp(user: User, category: SkillCategory, exp: number): void {
  if (!SKILL_CATEGORIES.includes(category)) return

  if (!user.skills[category]) {
    user.skills[category] = { level: 1, exp: 0 }
  }

  user.skills[category].exp += exp
  while (user.skills[category].exp >= user.skills[category].level * EXP_PER_LEVEL) {
    user.skills[category].exp -= user.skills[category].level * EXP_PER_LEVEL
    user.skills[category].level += 1
  }
}

function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...safeUser } = user
  return safeUser
}

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
    data: { userCount: users.length, workshopCount: workshops.length },
  })
})

app.get('/api/skills', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: SKILL_CATEGORIES,
  })
})

app.post('/api/auth/register', (req: Request, res: Response): void => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      res.status(400).json({ success: false, error: '用户名、邮箱和密码不能为空' })
      return
    }

    if (users.find((u) => u.username === username)) {
      res.status(409).json({ success: false, error: '用户名已存在' })
      return
    }

    if (users.find((u) => u.email === email)) {
      res.status(409).json({ success: false, error: '邮箱已被注册' })
      return
    }

    const newUser: User = {
      id: generateId('user'),
      username,
      email,
      password,
      registeredWorkshops: [],
      attendedWorkshops: [],
      skills: {},
    }

    users.push(newUser)
    saveUsers()

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: sanitizeUser(newUser),
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.post('/api/auth/login', (req: Request, res: Response): void => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' })
      return
    }

    const user = users.find((u) => (u.username === username || u.email === username) && u.password === password)

    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: sanitizeUser(user),
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.get('/api/users/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const user = users.find((u) => u.id === id)

    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.get('/api/workshops', (req: Request, res: Response): void => {
  try {
    const { category, hostId } = req.query
    let filtered = [...workshops]

    if (category) {
      filtered = filtered.filter((w) => w.category === category)
    }
    if (hostId) {
      filtered = filtered.filter((w) => w.hostId === hostId)
    }

    res.status(200).json({
      success: true,
      data: filtered,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.get('/api/workshops/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const workshop = workshops.find((w) => w.id === id)

    if (!workshop) {
      res.status(404).json({ success: false, error: '工作坊不存在' })
      return
    }

    res.status(200).json({
      success: true,
      data: workshop,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.post('/api/workshops', (req: Request, res: Response): void => {
  try {
    const { title, date, location, maxParticipants, materials, hostId, category } = req.body

    if (!title || !date || !location || !maxParticipants || !hostId || !category) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    if (!SKILL_CATEGORIES.includes(category)) {
      res.status(400).json({ success: false, error: '无效的技能分类' })
      return
    }

    const host = users.find((u) => u.id === hostId)
    if (!host) {
      res.status(404).json({ success: false, error: '主办方用户不存在' })
      return
    }

    const newWorkshop: Workshop = {
      id: generateId('workshop'),
      title,
      date,
      location,
      maxParticipants,
      materials: materials || [],
      participants: [],
      hostId,
      category,
      submissions: [],
    }

    workshops.push(newWorkshop)
    saveWorkshops()

    res.status(201).json({
      success: true,
      message: '工作坊创建成功',
      data: newWorkshop,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.put('/api/workshops/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const workshop = workshops.find((w) => w.id === id)

    if (!workshop) {
      res.status(404).json({ success: false, error: '工作坊不存在' })
      return
    }

    const { title, date, location, maxParticipants, materials, category } = req.body

    if (title !== undefined) workshop.title = title
    if (date !== undefined) workshop.date = date
    if (location !== undefined) workshop.location = location
    if (maxParticipants !== undefined) workshop.maxParticipants = maxParticipants
    if (materials !== undefined) workshop.materials = materials
    if (category !== undefined) {
      if (!SKILL_CATEGORIES.includes(category)) {
        res.status(400).json({ success: false, error: '无效的技能分类' })
        return
      }
      workshop.category = category
    }

    saveWorkshops()

    res.status(200).json({
      success: true,
      message: '工作坊更新成功',
      data: workshop,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.delete('/api/workshops/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const index = workshops.findIndex((w) => w.id === id)

    if (index === -1) {
      res.status(404).json({ success: false, error: '工作坊不存在' })
      return
    }

    const deletedWorkshop = workshops[index]
    workshops.splice(index, 1)

    users.forEach((user) => {
      user.registeredWorkshops = user.registeredWorkshops.filter((wid) => wid !== id)
      user.attendedWorkshops = user.attendedWorkshops.filter((wid) => wid !== id)
    })

    saveWorkshops()
    saveUsers()

    res.status(200).json({
      success: true,
      message: '工作坊删除成功',
      data: deletedWorkshop,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.post('/api/workshops/:id/register', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { userId } = req.body

    const workshop = workshops.find((w) => w.id === id)
    if (!workshop) {
      res.status(404).json({ success: false, error: '工作坊不存在' })
      return
    }

    const user = users.find((u) => u.id === userId)
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    if (workshop.participants.includes(userId)) {
      res.status(409).json({ success: false, error: '您已报名该工作坊' })
      return
    }

    if (workshop.participants.length >= workshop.maxParticipants) {
      res.status(409).json({ success: false, error: '工作坊名额已满' })
      return
    }

    workshop.participants.push(userId)
    user.registeredWorkshops.push(id)

    addSkillExp(user, workshop.category, EXP_PER_REGISTER)

    saveWorkshops()
    saveUsers()

    res.status(200).json({
      success: true,
      message: '报名成功，已获得技能经验值',
      data: {
        workshop,
        user: sanitizeUser(user),
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.post('/api/workshops/:id/unregister', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { userId } = req.body

    const workshop = workshops.find((w) => w.id === id)
    if (!workshop) {
      res.status(404).json({ success: false, error: '工作坊不存在' })
      return
    }

    const user = users.find((u) => u.id === userId)
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    if (!workshop.participants.includes(userId)) {
      res.status(409).json({ success: false, error: '您未报名该工作坊' })
      return
    }

    workshop.participants = workshop.participants.filter((uid) => uid !== userId)
    user.registeredWorkshops = user.registeredWorkshops.filter((wid) => wid !== id)

    saveWorkshops()
    saveUsers()

    res.status(200).json({
      success: true,
      message: '取消报名成功',
      data: {
        workshop,
        user: sanitizeUser(user),
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.post('/api/workshops/:id/submit', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { userId, photo } = req.body

    const workshop = workshops.find((w) => w.id === id)
    if (!workshop) {
      res.status(404).json({ success: false, error: '工作坊不存在' })
      return
    }

    const user = users.find((u) => u.id === userId)
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    if (!workshop.participants.includes(userId)) {
      res.status(403).json({ success: false, error: '您未报名该工作坊，无法提交作品' })
      return
    }

    if (!photo) {
      res.status(400).json({ success: false, error: '作品图片不能为空' })
      return
    }

    const existingSubmission = workshop.submissions.find((s) => s.userId === userId)
    if (existingSubmission) {
      existingSubmission.photo = photo
    } else {
      workshop.submissions.push({ userId, photo })
    }

    if (!user.attendedWorkshops.includes(id)) {
      user.attendedWorkshops.push(id)
    }

    saveWorkshops()
    saveUsers()

    res.status(200).json({
      success: true,
      message: '作品提交成功',
      data: workshop,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(error)
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API不存在',
  })
})

const PORT = 3001

loadData()

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
