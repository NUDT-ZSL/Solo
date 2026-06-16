import express, { type Request, type Response } from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const activitiesPath = path.resolve(__dirname, '../../data/activities.json')
const usersPath = path.resolve(__dirname, '../../data/users.json')
const tokensPath = path.resolve(__dirname, '../../data/tokens.json')

interface Lock {
  isLocked: boolean
  queue: (() => void)[]
}

const fileLock: Record<string, Lock> = {}

function getLock(filePath: string): Lock {
  if (!fileLock[filePath]) {
    fileLock[filePath] = { isLocked: false, queue: [] }
  }
  return fileLock[filePath]
}

async function acquireLock(filePath: string): Promise<void> {
  const lock = getLock(filePath)
  return new Promise((resolve) => {
    if (!lock.isLocked) {
      lock.isLocked = true
      resolve()
    } else {
      lock.queue.push(() => {
        lock.isLocked = true
        resolve()
      })
    }
  })
}

function releaseLock(filePath: string): void {
  const lock = getLock(filePath)
  lock.isLocked = false
  const next = lock.queue.shift()
  if (next) next()
}

async function readActivities() {
  await acquireLock(activitiesPath)
  try {
    const data = fs.readFileSync(activitiesPath, 'utf-8')
    return JSON.parse(data)
  } finally {
    releaseLock(activitiesPath)
  }
}

async function writeActivities(data: any[]) {
  await acquireLock(activitiesPath)
  try {
    fs.writeFileSync(activitiesPath, JSON.stringify(data, null, 2), 'utf-8')
  } finally {
    releaseLock(activitiesPath)
  }
}

async function readUsers() {
  await acquireLock(usersPath)
  try {
    const data = fs.readFileSync(usersPath, 'utf-8')
    return JSON.parse(data)
  } finally {
    releaseLock(usersPath)
  }
}

async function writeUsers(data: any[]) {
  await acquireLock(usersPath)
  try {
    fs.writeFileSync(usersPath, JSON.stringify(data, null, 2), 'utf-8')
  } finally {
    releaseLock(usersPath)
  }
}

interface TokenInfo {
  userId: string
  expiresAt: number
}

function readTokens(): Record<string, TokenInfo> {
  if (!fs.existsSync(tokensPath)) {
    fs.writeFileSync(tokensPath, JSON.stringify({}, null, 2), 'utf-8')
    return {}
  }
  const data = fs.readFileSync(tokensPath, 'utf-8')
  return JSON.parse(data)
}

function writeTokens(data: Record<string, TokenInfo>) {
  fs.writeFileSync(tokensPath, JSON.stringify(data, null, 2), 'utf-8')
}

const TOKEN_EXPIRES_HOURS = 24

function generateToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  const tokens = readTokens()
  tokens[token] = {
    userId,
    expiresAt: Date.now() + TOKEN_EXPIRES_HOURS * 60 * 60 * 1000,
  }
  writeTokens(tokens)
  return token
}

function verifyToken(token: string): string | null {
  const tokens = readTokens()
  const info = tokens[token]
  if (!info) return null
  if (Date.now() > info.expiresAt) {
    delete tokens[token]
    writeTokens(tokens)
    return null
  }
  return info.userId
}

function authenticate(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' })
    return null
  }
  const token = authHeader.replace('Bearer ', '')
  const userId = verifyToken(token)
  if (!userId) {
    res.status(401).json({ error: '认证令牌无效或已过期' })
    return null
  }
  return userId
}

function checkActivityStatus(activity: any, res: Response): boolean {
  if (activity.status === '已结束') {
    res.status(400).json({ error: '该活动已结束，无法进行此操作' })
    return false
  }
  return true
}

const router = express.Router()
router.use(cors())

router.get('/auth/token', (req: Request, res: Response) => {
  const { userId } = req.query
  if (!userId) {
    res.status(400).json({ error: '请提供用户ID' })
    return
  }
  const token = generateToken(userId as string)
  res.json({ token, userId, expiresIn: TOKEN_EXPIRES_HOURS * 60 * 60 })
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const activities = await readActivities()
    res.json({ activities })
  } catch (error) {
    res.status(500).json({ error: '读取活动数据失败' })
  }
})

router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await readUsers()
    res.json({ users })
  } catch (error) {
    res.status(500).json({ error: '读取用户数据失败' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req, res)
    if (!userId) return

    const users = await readUsers()
    const user = users.find((u: any) => u.id === userId)
    if (!user || user.role !== '管理员') {
      res.status(403).json({ error: '只有管理员可以创建活动' })
      return
    }

    const { title, description, date } = req.body

    if (!title || title.length < 5) {
      res.status(400).json({ error: '活动标题至少需要5个字符' })
      return
    }

    if (!description || description.length < 20) {
      res.status(400).json({ error: '活动描述至少需要20个字符' })
      return
    }

    if (!date) {
      res.status(400).json({ error: '请提供活动日期' })
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const activityDate = new Date(date)
    activityDate.setHours(0, 0, 0, 0)

    if (activityDate < today) {
      res.status(400).json({ error: '活动日期不能早于今天' })
      return
    }

    const oneYearLater = new Date()
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
    oneYearLater.setHours(0, 0, 0, 0)
    if (activityDate > oneYearLater) {
      res.status(400).json({ error: '活动日期不能超过一年后' })
      return
    }

    const newActivity = {
      id: uuidv4(),
      title,
      description,
      date,
      status: '进行中',
      registrations: [],
      claimedBy: [],
      hoursLogged: [],
      createdAt: new Date().toISOString(),
      version: 0,
    }

    const activities = await readActivities()
    activities.unshift(newActivity)
    await writeActivities(activities)

    res.status(201).json({ activity: newActivity })
  } catch (error) {
    res.status(500).json({ error: '创建活动失败' })
  }
})

router.post('/:id/register', async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req, res)
    if (!userId) return

    const { id } = req.params
    const { expectedVersion } = req.body

    if (req.body.userId && req.body.userId !== userId) {
      res.status(403).json({ error: '认证用户与请求用户不一致' })
      return
    }

    const MAX_ATTEMPTS = 5
    let attempt = 0
    let lastError: any = null

    while (attempt < MAX_ATTEMPTS) {
      attempt++
      const activities = await readActivities()
      const activityIndex = activities.findIndex((a: any) => a.id === id)
      const activity = activities[activityIndex]

      if (!activity) {
        res.status(404).json({ error: '活动不存在' })
        return
      }

      if (!checkActivityStatus(activity, res)) return

      if (activity.registrations.includes(userId)) {
        res.status(400).json({ error: '该用户已报名此活动' })
        return
      }

      const MAX_REGISTRATIONS = 50
      if (activity.registrations.length >= MAX_REGISTRATIONS) {
        res.status(400).json({ error: '活动名额已满' })
        return
      }

      const currentVersion = activity.version || 0
      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        lastError = { status: 409, error: '数据已被修改，请重试' }
        await new Promise((r) => setTimeout(r, attempt * 50))
        continue
      }

      activity.registrations.push(userId)
      activity.version = currentVersion + 1
      activities[activityIndex] = activity
      await writeActivities(activities)

      const users = await readUsers()
      const user = users.find((u: any) => u.id === userId)
      if (user) {
        if (!user.registeredActivities.includes(id)) {
          user.registeredActivities.push(id)
        }
        await writeUsers(users)
      }

      res.json({ activity, user, version: activity.version })
      return
    }

    if (lastError) {
      res.status(lastError.status).json({ error: lastError.error })
    } else {
      res.status(500).json({ error: '报名失败，请重试' })
    }
  } catch (error) {
    res.status(500).json({ error: '报名失败' })
  }
})

router.post('/:id/claim', async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req, res)
    if (!userId) return

    const { id } = req.params

    if (req.body.userId && req.body.userId !== userId) {
      res.status(403).json({ error: '认证用户与请求用户不一致' })
      return
    }

    const users = await readUsers()
    const user = users.find((u: any) => u.id === userId)
    if (!user || user.role !== '志愿者') {
      res.status(403).json({ error: '只有志愿者可以认领任务' })
      return
    }

    const MAX_ATTEMPTS = 5
    let attempt = 0
    let lastError: any = null

    while (attempt < MAX_ATTEMPTS) {
      attempt++
      const activities = await readActivities()
      const activityIndex = activities.findIndex((a: any) => a.id === id)
      const activity = activities[activityIndex]

      if (!activity) {
        res.status(404).json({ error: '活动不存在' })
        return
      }

      if (!checkActivityStatus(activity, res)) return

      if (activity.claimedBy.includes(userId)) {
        res.status(400).json({ error: '该用户已认领此任务' })
        return
      }

      const currentVersion = activity.version || 0
      activity.claimedBy.push(userId)
      activity.version = currentVersion + 1
      activities[activityIndex] = activity
      await writeActivities(activities)

      if (user) {
        if (!user.claimedTasks.includes(id)) {
          user.claimedTasks.push(id)
        }
        await writeUsers(users)
      }

      res.json({ activity, user, version: activity.version })
      return
    }

    res.status(500).json({ error: '认领任务失败，请重试' })
  } catch (error) {
    res.status(500).json({ error: '认领任务失败' })
  }
})

router.post('/:id/logHours', async (req: Request, res: Response) => {
  try {
    const userId = authenticate(req, res)
    if (!userId) return

    const { id } = req.params
    const { hours } = req.body

    if (req.body.userId && req.body.userId !== userId) {
      res.status(403).json({ error: '认证用户与请求用户不一致' })
      return
    }

    const users = await readUsers()
    const user = users.find((u: any) => u.id === userId)
    if (!user || user.role !== '志愿者') {
      res.status(403).json({ error: '只有志愿者可以记录服务时长' })
      return
    }

    if (hours === undefined || hours === null) {
      res.status(400).json({ error: '请提供服务时长' })
      return
    }

    const numericHours = Number(hours)
    if (isNaN(numericHours) || numericHours < 0.5 || numericHours > 24) {
      res.status(400).json({ error: '服务时长应在0.5到24小时之间' })
      return
    }

    const MAX_ATTEMPTS = 5
    let attempt = 0

    while (attempt < MAX_ATTEMPTS) {
      attempt++
      const activities = await readActivities()
      const activityIndex = activities.findIndex((a: any) => a.id === id)
      const activity = activities[activityIndex]

      if (!activity) {
        res.status(404).json({ error: '活动不存在' })
        return
      }

      if (!activity.claimedBy.includes(userId)) {
        res.status(400).json({ error: '请先认领此任务再记录时长' })
        return
      }

      const currentVersion = activity.version || 0
      activity.hoursLogged.push({ userId, hours: numericHours })
      activity.version = currentVersion + 1
      activities[activityIndex] = activity
      await writeActivities(activities)

      if (user) {
        user.totalHours = (user.totalHours || 0) + numericHours
        await writeUsers(users)
      }

      res.json({ activity, user, version: activity.version })
      return
    }

    res.status(500).json({ error: '记录时长失败，请重试' })
  } catch (error) {
    res.status(500).json({ error: '记录时长失败' })
  }
})

export default router
