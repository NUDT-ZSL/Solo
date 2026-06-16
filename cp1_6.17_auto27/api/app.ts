import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import authRoutes from './routes/auth.js'

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

interface Member {
  id: string
  username: string
  role: 'manager' | 'member'
  points: number
  avatar: string
}

interface Region {
  id: string
  gardenId: string
  name: string
  crop: string
  growDays: number
  lastWateredAt: string | null
  logs: Log[]
  tasks: Task[]
}

interface Log {
  id: string
  regionId: string
  authorId: string
  authorName: string
  content: string
  photoUrl: string | null
  createdAt: string
}

interface Task {
  id: string
  regionId: string
  assigneeId: string
  assigneeName: string
  type: string
  completed: boolean
  createdAt: string
}

const members: Member[] = [
  { id: 'm1', username: '张三', role: 'manager', points: 320, avatar: '👨‍🌾' },
  { id: 'm2', username: '李四', role: 'member', points: 180, avatar: '👩‍🌾' },
  { id: 'm3', username: '王五', role: 'member', points: 250, avatar: '🧑‍🌾' },
  { id: 'm4', username: '赵六', role: 'member', points: 140, avatar: '👨‍🍳' },
]

const regions: Region[] = [
  {
    id: 'r1',
    gardenId: 'g1',
    name: 'A区',
    crop: '番茄',
    growDays: 60,
    lastWateredAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    logs: [
      {
        id: 'l1',
        regionId: 'r1',
        authorId: 'm1',
        authorName: '张三',
        content: '番茄苗长势良好，已开始开花',
        photoUrl: null,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    tasks: [
      {
        id: 't1',
        regionId: 'r1',
        assigneeId: 'm2',
        assigneeName: '李四',
        type: '施肥',
        completed: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'r2',
    gardenId: 'g1',
    name: 'B区',
    crop: '黄瓜',
    growDays: 50,
    lastWateredAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    logs: [
      {
        id: 'l2',
        regionId: 'r2',
        authorId: 'm2',
        authorName: '李四',
        content: '黄瓜藤蔓已经开始攀架',
        photoUrl: null,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    tasks: [],
  },
  {
    id: 'r3',
    gardenId: 'g1',
    name: 'C区',
    crop: '胡萝卜',
    growDays: 70,
    lastWateredAt: null,
    logs: [],
    tasks: [
      {
        id: 't2',
        regionId: 'r3',
        assigneeId: 'm3',
        assigneeName: '王五',
        type: '除草',
        completed: false,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'r4',
    gardenId: 'g1',
    name: 'D区',
    crop: '生菜',
    growDays: 30,
    lastWateredAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    logs: [
      {
        id: 'l3',
        regionId: 'r4',
        authorId: 'm3',
        authorName: '王五',
        content: '生菜可以采摘了，叶片鲜嫩',
        photoUrl: null,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
    ],
    tasks: [
      {
        id: 't3',
        regionId: 'r4',
        assigneeId: 'm1',
        assigneeName: '张三',
        type: '采摘',
        completed: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'r5',
    gardenId: 'g1',
    name: 'E区',
    crop: '茄子',
    growDays: 80,
    lastWateredAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    logs: [],
    tasks: [],
  },
  {
    id: 'r6',
    gardenId: 'g1',
    name: 'F区',
    crop: '辣椒',
    growDays: 90,
    lastWateredAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    logs: [
      {
        id: 'l4',
        regionId: 'r6',
        authorId: 'm4',
        authorName: '赵六',
        content: '辣椒已经开始变红，预计一周后可收获',
        photoUrl: null,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ],
    tasks: [],
  },
]

const gardens = [
  { id: 'g1', name: '阳光社区菜园', regions },
]

const COOLDOWN_MS = 36 * 60 * 60 * 1000

function findMember(id: string): Member | undefined {
  return members.find((m) => m.id === id)
}

app.use('/api/auth', authRoutes)

app.post('/api/login', (req: Request, res: Response): void => {
  const { username, role } = req.body
  if (!username || !role) {
    res.status(400).json({ success: false, error: '缺少 username 或 role' })
    return
  }

  const matched = members.find(
    (m) => m.username === username && m.role === role,
  )
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

app.get('/api/gardens', (_req: Request, res: Response): void => {
  const result = gardens.map((g) => ({
    id: g.id,
    name: g.name,
    regions: g.regions.map((r) => ({
      id: r.id,
      name: r.name,
      crop: r.crop,
      growDays: r.growDays,
      lastWateredAt: r.lastWateredAt,
    })),
  }))
  res.json(result)
})

app.get('/api/regions/:id', (req: Request, res: Response): void => {
  const region = regions.find((r) => r.id === req.params.id)
  if (!region) {
    res.status(404).json({ success: false, error: '区域不存在' })
    return
  }
  res.json(region)
})

app.post('/api/water', (req: Request, res: Response): void => {
  const { regionId, userId } = req.body
  if (!regionId || !userId) {
    res.status(400).json({ success: false, error: '缺少 regionId 或 userId' })
    return
  }

  const region = regions.find((r) => r.id === regionId)
  if (!region) {
    res.status(404).json({ success: false, error: '区域不存在' })
    return
  }

  const now = Date.now()
  if (region.lastWateredAt) {
    const elapsed = now - new Date(region.lastWateredAt).getTime()
    const remaining = COOLDOWN_MS - elapsed
    if (remaining > 0) {
      res.json({
        success: false,
        message: '冷却中，请稍后再浇水',
        lastWateredAt: region.lastWateredAt,
        cooldownRemaining: remaining,
      })
      return
    }
  }

  region.lastWateredAt = new Date(now).toISOString()
  res.json({
    success: true,
    message: '浇水成功！',
    lastWateredAt: region.lastWateredAt,
    cooldownRemaining: 0,
  })
})

app.post('/api/logs', (req: Request, res: Response): void => {
  const { regionId, authorId, content, photoUrl } = req.body
  if (!regionId || !authorId || !content) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  const region = regions.find((r) => r.id === regionId)
  if (!region) {
    res.status(404).json({ success: false, error: '区域不存在' })
    return
  }

  const author = findMember(authorId)
  const log: Log = {
    id: uuidv4(),
    regionId,
    authorId,
    authorName: author?.username ?? '未知',
    content,
    photoUrl: photoUrl ?? null,
    createdAt: new Date().toISOString(),
  }
  region.logs.unshift(log)
  res.json(log)
})

app.post('/api/tasks', (req: Request, res: Response): void => {
  const { regionId, assigneeId, type } = req.body
  if (!regionId || !assigneeId || !type) {
    res.status(400).json({ success: false, error: '缺少必填字段' })
    return
  }

  const region = regions.find((r) => r.id === regionId)
  if (!region) {
    res.status(404).json({ success: false, error: '区域不存在' })
    return
  }

  const assignee = findMember(assigneeId)
  const task: Task = {
    id: uuidv4(),
    regionId,
    assigneeId,
    assigneeName: assignee?.username ?? '未知',
    type,
    completed: false,
    createdAt: new Date().toISOString(),
  }
  region.tasks.push(task)
  res.json(task)
})

app.post('/api/tasks/:id/complete', (req: Request, res: Response): void => {
  const task = regions.flatMap((r) => r.tasks).find((t) => t.id === req.params.id)
  if (!task) {
    res.status(404).json({ success: false, error: '任务不存在' })
    return
  }
  if (task.completed) {
    res.status(400).json({ success: false, error: '任务已完成' })
    return
  }

  task.completed = true
  const member = findMember(task.assigneeId)
  if (member) {
    member.points += 50
  }
  res.json({
    success: true,
    pointsEarned: 50,
    totalPoints: member?.points ?? 0,
  })
})

app.get('/api/members', (_req: Request, res: Response): void => {
  res.json(members)
})

app.use(
  '/api/health',
  (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({ success: true, message: 'ok' })
  },
)

app.use((_error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
