import express, { Request, Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'
import type { Event, Participant, EventStats, CreateEventDto, RegisterDto, CheckInDto } from '../src/types'

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json())

const eventsMap = new Map<string, Event>()

const today = new Date()
const formatDate = (date: Date) => date.toISOString().split('T')[0]
const addDays = (date: Date, days: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

eventsMap.set('event-1', {
  id: 'event-1',
  title: '《平凡的世界》作者签售会',
  date: addDays(today, 8),
  description: '路遥先生经典作品签售活动，与读者面对面交流创作心得，分享平凡人生中的不平凡故事。现场购买书籍可获得专属签名版。',
  maxParticipants: 50,
  participants: [
    {
      id: 'p-1',
      name: '张三',
      phone: '138****0001',
      registeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      checkedIn: false
    },
    {
      id: 'p-2',
      name: '李四',
      phone: '139****0002',
      registeredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      checkedIn: false
    }
  ]
})

eventsMap.set('event-2', {
  id: 'event-2',
  title: '读书俱乐部：科幻文学专场',
  date: addDays(today, 3),
  description: '本月读书俱乐部主题为科幻文学，共同探讨《三体》、《沙丘》等经典科幻作品的魅力。欢迎所有科幻爱好者参与！',
  maxParticipants: 20,
  participants: [
    {
      id: 'p-3',
      name: '王五',
      phone: '137****0003',
      registeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      checkedIn: false
    },
    {
      id: 'p-4',
      name: '赵六',
      phone: '136****0004',
      registeredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      checkedIn: false
    },
    {
      id: 'p-5',
      name: '钱七',
      phone: '135****0005',
      registeredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      checkedIn: false
    }
  ]
})

eventsMap.set('event-3', {
  id: 'event-3',
  title: '儿童故事会：安徒生童话',
  date: formatDate(today),
  description: '专为4-10岁儿童设计的故事会活动，本周主题为安徒生经典童话。现场有互动游戏和小礼品赠送，需家长陪同。',
  maxParticipants: 15,
  participants: [
    {
      id: 'p-6',
      name: '小明妈妈',
      phone: '134****0006',
      registeredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      checkedIn: false
    }
  ]
})

eventsMap.set('event-4', {
  id: 'event-4',
  title: '诗歌朗诵会：春天的序曲',
  date: addDays(today, 15),
  description: '春日诗歌主题朗诵会，欢迎诗歌爱好者带来自己喜欢的作品，或分享原创诗歌。现场提供茶水和点心。',
  maxParticipants: 30,
  participants: []
})

eventsMap.set('event-5', {
  id: 'event-5',
  title: '古籍修复体验工坊',
  date: addDays(today, 22),
  description: '跟随古籍修复师学习基础的古籍修复技巧，了解纸张保存知识。名额有限，需提前预约。',
  maxParticipants: 10,
  participants: [
    {
      id: 'p-7',
      name: '孙八',
      phone: '133****0007',
      registeredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      checkedIn: false
    },
    {
      id: 'p-8',
      name: '周九',
      phone: '132****0008',
      registeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      checkedIn: false
    }
  ]
})

const getTodayStr = () => formatDate(new Date())

const formatTime = (isoString: string) => {
  const d = new Date(isoString)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

app.get('/api/events', (req: Request, res: Response) => {
  const events = Array.from(eventsMap.values())
  res.json({ data: events })
})

app.get('/api/events/stats', (req: Request, res: Response) => {
  const stats: EventStats[] = Array.from(eventsMap.values()).map(event => ({
    eventId: event.id,
    title: event.title,
    registeredCount: event.participants.length,
    checkedInCount: event.participants.filter(p => p.checkedIn).length,
    registerRate: event.maxParticipants > 0 
      ? Math.round((event.participants.length / event.maxParticipants) * 100) 
      : 0
  }))
  res.json({ data: stats })
})

app.get('/api/events/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const event = eventsMap.get(id)
  if (!event) {
    res.status(404).json({ error: '活动不存在' })
    return
  }
  res.json({ data: event })
})

app.post('/api/events', (req: Request, res: Response) => {
  const { title, date, description, maxParticipants } = req.body as CreateEventDto

  if (!title || !date || !description || !maxParticipants) {
    res.status(400).json({ error: '请填写完整的活动信息' })
    return
  }

  const eventDate = new Date(date)
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  
  if (eventDate < todayDate) {
    res.status(400).json({ error: '活动日期必须是未来日期' })
    return
  }

  const newEvent: Event = {
    id: `event-${uuidv4()}`,
    title,
    date,
    description,
    maxParticipants,
    participants: []
  }

  eventsMap.set(newEvent.id, newEvent)
  res.json({ data: newEvent })
})

app.put('/api/events/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const { title, date, description, maxParticipants } = req.body as CreateEventDto

  const event = eventsMap.get(id)
  if (!event) {
    res.status(404).json({ error: '活动不存在' })
    return
  }

  if (!title || !date || !description || !maxParticipants) {
    res.status(400).json({ error: '请填写完整的活动信息' })
    return
  }

  const updatedEvent: Event = {
    ...event,
    title,
    date,
    description,
    maxParticipants
  }

  eventsMap.set(id, updatedEvent)
  res.json({ data: updatedEvent })
})

app.delete('/api/events/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const event = eventsMap.get(id)
  
  if (!event) {
    res.status(404).json({ error: '活动不存在' })
    return
  }

  eventsMap.delete(id)
  res.json({ data: { success: true } })
})

app.post('/api/events/:id/register', (req: Request, res: Response) => {
  const { id } = req.params
  const { name, phone } = req.body as RegisterDto

  const event = eventsMap.get(id)
  if (!event) {
    res.status(404).json({ error: '活动不存在' })
    return
  }

  if (event.participants.length >= event.maxParticipants) {
    res.status(400).json({ error: '很抱歉，该活动报名人数已满' })
    return
  }

  const isAlreadyRegistered = event.participants.some(p => p.phone === phone)
  if (isAlreadyRegistered) {
    res.status(400).json({ error: '您已报名该活动' })
    return
  }

  const participant: Participant = {
    id: `p-${uuidv4()}`,
    name,
    phone,
    registeredAt: new Date().toISOString(),
    checkedIn: false
  }

  event.participants.push(participant)
  eventsMap.set(id, event)
  res.json({ data: participant })
})

app.post('/api/events/:id/checkin', (req: Request, res: Response) => {
  const { id } = req.params
  const { participantId } = req.body as CheckInDto

  const event = eventsMap.get(id)
  if (!event) {
    res.status(404).json({ error: '活动不存在' })
    return
  }

  if (event.date !== getTodayStr()) {
    res.status(403).json({ error: '仅活动当天可签到' })
    return
  }

  const participant = event.participants.find(p => p.id === participantId)
  if (!participant) {
    res.status(404).json({ error: '参与者不存在' })
    return
  }

  if (participant.checkedIn) {
    res.status(400).json({ error: '已完成签到' })
    return
  }

  participant.checkedIn = true
  participant.checkedInAt = new Date().toISOString()
  eventsMap.set(id, event)
  res.json({ data: participant })
})

app.listen(PORT, () => {
  console.log(`BookEvents API server running on http://localhost:${PORT}`)
})
