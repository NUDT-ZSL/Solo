import express, { type Request, type Response } from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const activitiesPath = path.resolve(__dirname, '../../data/activities.json')
const usersPath = path.resolve(__dirname, '../../data/users.json')

function readActivities() {
  const data = fs.readFileSync(activitiesPath, 'utf-8')
  return JSON.parse(data)
}

function writeActivities(data: any[]) {
  fs.writeFileSync(activitiesPath, JSON.stringify(data, null, 2), 'utf-8')
}

function readUsers() {
  const data = fs.readFileSync(usersPath, 'utf-8')
  return JSON.parse(data)
}

function writeUsers(data: any[]) {
  fs.writeFileSync(usersPath, JSON.stringify(data, null, 2), 'utf-8')
}

const router = express.Router()
router.use(cors())

router.get('/', (req: Request, res: Response) => {
  try {
    const activities = readActivities()
    res.json({ activities })
  } catch (error) {
    res.status(500).json({ error: '读取活动数据失败' })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
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
    }

    const activities = readActivities()
    activities.unshift(newActivity)
    writeActivities(activities)

    res.status(201).json({ activity: newActivity })
  } catch (error) {
    res.status(500).json({ error: '创建活动失败' })
  }
})

router.post('/:id/register', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { userId } = req.body

    if (!userId) {
      res.status(400).json({ error: '请提供用户ID' })
      return
    }

    const activities = readActivities()
    const activity = activities.find((a: any) => a.id === id)

    if (!activity) {
      res.status(404).json({ error: '活动不存在' })
      return
    }

    if (activity.registrations.includes(userId)) {
      res.status(400).json({ error: '该用户已报名此活动' })
      return
    }

    activity.registrations.push(userId)
    writeActivities(activities)

    const users = readUsers()
    const user = users.find((u: any) => u.id === userId)
    if (user) {
      if (!user.registeredActivities.includes(id)) {
        user.registeredActivities.push(id)
      }
      writeUsers(users)
    }

    res.json({ activity })
  } catch (error) {
    res.status(500).json({ error: '报名失败' })
  }
})

router.post('/:id/claim', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { userId } = req.body

    if (!userId) {
      res.status(400).json({ error: '请提供用户ID' })
      return
    }

    const activities = readActivities()
    const activity = activities.find((a: any) => a.id === id)

    if (!activity) {
      res.status(404).json({ error: '活动不存在' })
      return
    }

    if (activity.claimedBy.includes(userId)) {
      res.status(400).json({ error: '该用户已认领此任务' })
      return
    }

    activity.claimedBy.push(userId)
    writeActivities(activities)

    const users = readUsers()
    const user = users.find((u: any) => u.id === userId)
    if (user) {
      if (!user.claimedTasks.includes(id)) {
        user.claimedTasks.push(id)
      }
      writeUsers(users)
    }

    res.json({ activity })
  } catch (error) {
    res.status(500).json({ error: '认领任务失败' })
  }
})

router.post('/:id/logHours', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { userId, hours } = req.body

    if (!userId) {
      res.status(400).json({ error: '请提供用户ID' })
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

    const activities = readActivities()
    const activity = activities.find((a: any) => a.id === id)

    if (!activity) {
      res.status(404).json({ error: '活动不存在' })
      return
    }

    activity.hoursLogged.push({ userId, hours: numericHours })
    writeActivities(activities)

    const users = readUsers()
    const user = users.find((u: any) => u.id === userId)
    if (user) {
      user.totalHours = (user.totalHours || 0) + numericHours
      writeUsers(users)
    }

    res.json({ activity })
  } catch (error) {
    res.status(500).json({ error: '记录时长失败' })
  }
})

export default router
