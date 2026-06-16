import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

export interface Activity {
  id: string
  name: string
  description: string
  date: string
  time: string
  location: string
  category: '讲座' | '工作坊' | '户外活动'
  capacity: number
  registeredCount: number
  organizer: string
  organizerInfo: string
  checkInCode: string
}

export interface Registration {
  id: string
  activityId: string
  name: string
  email: string
  phone: string
  registeredAt: string
  checkedIn: boolean
  checkedInAt: string | null
}

const categories = ['讲座', '工作坊', '户外活动'] as const

const generateMockActivities = (): Activity[] => {
  const activities: Activity[] = []
  const today = new Date()
  
  for (let i = 1; i <= 25; i++) {
    const daysOffset = Math.floor(Math.random() * 30) - 5
    const activityDate = new Date(today)
    activityDate.setDate(today.getDate() + daysOffset)
    
    const category = categories[Math.floor(Math.random() * categories.length)]
    const capacity = 20 + Math.floor(Math.random() * 80)
    const registeredCount = Math.floor(Math.random() * capacity)
    
    activities.push({
      id: `activity-${i}`,
      name: `${category}活动 ${i}：${['技术分享', '创意手工', '户外徒步', '编程入门', '摄影技巧', '健康讲座'][i % 6]}`,
      description: `这是一场精彩的${category}活动，内容丰富有趣，适合各年龄段参与。我们邀请了资深讲师带领大家深入探索相关领域的知识和技能。活动过程中会有互动环节和实践操作，让每位参与者都能获得实实在在的收获。`,
      date: activityDate.toISOString().split('T')[0],
      time: `${9 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}`,
      location: ['社区中心A室', '多功能会议厅', '市民广场', '创客空间', '户外公园'][i % 5],
      category,
      capacity,
      registeredCount,
      organizer: ['社区文化中心', '青年志愿者协会', '科技教育基金会', '户外运动俱乐部'][i % 4],
      organizerInfo: '致力于为社区居民提供优质的文化活动和学习机会，丰富大家的精神文化生活。',
      checkInCode: `CHECK${2024 + i}`
    })
  }
  return activities
}

const generateMockRegistrations = (activities: Activity[]): Registration[] => {
  const registrations: Registration[] = []
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '冯十二']
  const domains = ['gmail.com', 'qq.com', '163.com', 'outlook.com']
  
  activities.forEach(activity => {
    for (let i = 0; i < activity.registeredCount; i++) {
      const name = names[Math.floor(Math.random() * names.length)]
      const checkedIn = Math.random() > 0.4
      const checkInDate = new Date(activity.date)
      checkInDate.setHours(10, 0, 0, 0)
      
      registrations.push({
        id: uuidv4(),
        activityId: activity.id,
        name,
        email: `${name.toLowerCase().replace(/\s/g, '')}${i}@${domains[Math.floor(Math.random() * domains.length)]}`,
        phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        registeredAt: new Date(checkInDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        checkedIn,
        checkedInAt: checkedIn ? checkInDate.toISOString() : null
      })
    }
  })
  
  return registrations
}

let activities: Activity[] = generateMockActivities()
let registrations: Registration[] = generateMockRegistrations(activities)

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

app.get('/api/activities', async (req: Request, res: Response) => {
  await delay(800)
  
  const { page = 1, pageSize = 10, category, startDate, endDate } = req.query
  
  let filtered = [...activities]
  
  if (category && category !== 'all') {
    filtered = filtered.filter(a => a.category === category)
  }
  
  if (startDate) {
    filtered = filtered.filter(a => a.date >= startDate)
  }
  
  if (endDate) {
    filtered = filtered.filter(a => a.date <= endDate)
  }
  
  filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const pageNum = parseInt(page as string)
  const size = parseInt(pageSize as string)
  const start = (pageNum - 1) * size
  const end = start + size
  
  const paginated = filtered.slice(start, end)
  const total = filtered.length
  
  res.json({
    activities: paginated,
    pagination: {
      page: pageNum,
      pageSize: size,
      total,
      totalPages: Math.ceil(total / size)
    }
  })
})

app.get('/api/activities/:id', async (req: Request, res: Response) => {
  await delay(500)
  const activity = activities.find(a => a.id === req.params.id)
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }
  res.json(activity)
})

app.get('/api/activities/:id/registrations', async (req: Request, res: Response) => {
  await delay(400)
  const activityRegistrations = registrations.filter(r => r.activityId === req.params.id)
  res.json(activityRegistrations)
})

app.post('/api/register', async (req: Request, res: Response) => {
  await delay(600)
  const { activityId, name, email, phone } = req.body
  
  if (!activityId || !name || !email || !phone) {
    return res.status(400).json({ error: '请填写完整信息' })
  }
  
  const activity = activities.find(a => a.id === activityId)
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' })
  }
  
  const existingRegistration = registrations.find(
    r => r.activityId === activityId && (r.email === email || r.phone === phone)
  )
  
  if (existingRegistration) {
    return res.status(400).json({ error: '您已报名此活动' })
  }
  
  if (activity.registeredCount >= activity.capacity) {
    return res.status(400).json({ error: '名额已满' })
  }
  
  const newRegistration: Registration = {
    id: uuidv4(),
    activityId,
    name,
    email,
    phone,
    registeredAt: new Date().toISOString(),
    checkedIn: false,
    checkedInAt: null
  }
  
  registrations.push(newRegistration)
  
  const activityIndex = activities.findIndex(a => a.id === activityId)
  if (activityIndex !== -1) {
    activities[activityIndex] = {
      ...activities[activityIndex],
      registeredCount: activities[activityIndex].registeredCount + 1
    }
  }
  
  res.json({
    success: true,
    registration: newRegistration,
    message: '报名成功'
  })
})

app.post('/api/checkin', async (req: Request, res: Response) => {
  await delay(500)
  const { code, email, phone } = req.body
  
  if (!code) {
    return res.status(400).json({ error: '请输入签到码' })
  }
  
  const activity = activities.find(a => a.checkInCode === code.toUpperCase())
  if (!activity) {
    return res.status(400).json({ error: '签到码无效' })
  }
  
  const registrationIndex = registrations.findIndex(
    r => r.activityId === activity.id && (r.email === email || r.phone === phone)
  )
  
  if (registrationIndex === -1) {
    return res.status(400).json({ error: '未找到您的报名记录' })
  }
  
  if (registrations[registrationIndex].checkedIn) {
    return res.status(400).json({ error: '您已完成签到' })
  }
  
  registrations[registrationIndex] = {
    ...registrations[registrationIndex],
    checkedIn: true,
    checkedInAt: new Date().toISOString()
  }
  
  res.json({
    success: true,
    registration: registrations[registrationIndex],
    activity,
    message: '签到成功'
  })
})

app.post('/api/admin/login', async (req: Request, res: Response) => {
  await delay(300)
  const { password } = req.body
  if (password === 'admin123') {
    res.json({ success: true, token: 'mock-admin-token' })
  } else {
    res.status(401).json({ error: '密码错误' })
  }
})

app.get('/api/admin/activities', async (req: Request, res: Response) => {
  await delay(500)
  res.json(activities)
})

app.get('/api/admin/activities/:id/registrations', async (req: Request, res: Response) => {
  await delay(400)
  const activityRegistrations = registrations.filter(r => r.activityId === req.params.id)
  res.json(activityRegistrations)
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
