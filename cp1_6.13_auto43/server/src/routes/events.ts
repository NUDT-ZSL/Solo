import { Router, Request, Response } from 'express'
import Datastore from 'nedb-promises'
import { v4 as uuidv4 } from 'uuid'
import type { Event, Registration, CreateEventRequest, RegisterRequest, CheckinRequest } from '../types.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

const eventsDB = Datastore.create({
  filename: path.join(__dirname, '../../data/events.db'),
  autoload: true
}) as unknown as Datastore<Event>

const registrationsDB = Datastore.create({
  filename: path.join(__dirname, '../../data/registrations.db'),
  autoload: true
}) as unknown as Datastore<Registration>

function generateCheckinCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const eventsCache = new Map<string, CacheEntry<Event[]>>()
const CACHE_TTL = 30 * 1000

function getCachedEvents(key: string): Event[] | null {
  const entry = eventsCache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }
  return null
}

function setCachedEvents(key: string, data: Event[]): void {
  eventsCache.set(key, { data, timestamp: Date.now() })
}

function clearEventsCache(): void {
  eventsCache.clear()
}

router.get('/events', async (req: Request, res: Response) => {
  try {
    const { category } = req.query
    const cacheKey = category ? String(category) : 'all'

    const cached = getCachedEvents(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    const query: any = {}
    if (category && category !== 'all') {
      query.category = category
    }
    const events = await eventsDB.find(query).sort({ createdAt: -1 })

    setCachedEvents(cacheKey, events)

    res.json(events)
  } catch (error) {
    res.status(500).json({ error: '获取活动列表失败' })
  }
})

router.post('/events', async (req: Request, res: Response) => {
  try {
    const { title, category, date, location, capacity, description, organizer }: CreateEventRequest = req.body

    if (!title || !category || !date || !location || !capacity) {
      return res.status(400).json({ error: '缺少必填字段' })
    }

    const newEvent: Event = {
      _id: uuidv4(),
      title,
      category,
      date,
      location,
      capacity,
      description: description || '',
      organizer: organizer || '校园活动中心',
      registeredCount: 0,
      createdAt: new Date().toISOString()
    }

    const event = await eventsDB.insert(newEvent)
    clearEventsCache()
    res.status(201).json(event)
  } catch (error) {
    res.status(500).json({ error: '创建活动失败' })
  }
})

router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const event = await eventsDB.findOne({ _id: id })

    if (!event) {
      return res.status(404).json({ error: '活动不存在' })
    }

    res.json(event)
  } catch (error) {
    res.status(500).json({ error: '获取活动详情失败' })
  }
})

router.get('/events/:id/registrations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { page = '1', pageSize = '10' } = req.query
    const pageNum = parseInt(page as string)
    const limit = parseInt(pageSize as string)
    const skip = (pageNum - 1) * limit

    const registrations = await registrationsDB
      .find({ eventId: id })
      .sort({ registeredAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await registrationsDB.count({ eventId: id })

    res.json({
      data: registrations,
      total,
      page: pageNum,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    res.status(500).json({ error: '获取报名列表失败' })
  }
})

router.post('/events/:id/register', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, studentId, email }: RegisterRequest = req.body

    if (!name || !studentId || !email) {
      return res.status(400).json({ error: '请填写完整的报名信息' })
    }

    const event = await eventsDB.findOne({ _id: id })
    if (!event) {
      return res.status(404).json({ error: '活动不存在' })
    }

    if (event.registeredCount >= event.capacity) {
      return res.status(400).json({ error: '活动名额已满' })
    }

    const existingRegistration = await registrationsDB.findOne({ eventId: id, studentId })
    if (existingRegistration) {
      return res.status(400).json({ error: '该学号已报名此活动' })
    }

    const registration: Registration = {
      _id: uuidv4(),
      eventId: id,
      name,
      studentId,
      email,
      checkinCode: generateCheckinCode(),
      checkedIn: false,
      registeredAt: new Date().toISOString()
    }

    await registrationsDB.insert(registration)
    await eventsDB.update({ _id: id }, { $inc: { registeredCount: 1 } })
    clearEventsCache()

    res.status(201).json(registration)
  } catch (error) {
    res.status(500).json({ error: '报名失败' })
  }
})

router.patch('/events/:id/checkin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { checkinCode }: CheckinRequest = req.body

    if (!checkinCode) {
      return res.status(400).json({ error: '请输入签到码' })
    }

    const registration = await registrationsDB.findOne({ eventId: id, checkinCode })
    if (!registration) {
      return res.status(404).json({ error: '签到码无效' })
    }

    if (registration.checkedIn) {
      return res.status(400).json({ error: '该签到码已使用，请勿重复签到' })
    }

    const result = await registrationsDB.update(
      { _id: registration._id },
      { $set: { checkedIn: true, checkedInAt: new Date().toISOString() } },
      { returnUpdatedDocs: true }
    )

    const updatedRegistration = Array.isArray(result) ? result[0] : result
    clearEventsCache()

    res.json(updatedRegistration)
  } catch (error) {
    res.status(500).json({ error: '签到失败' })
  }
})

export default router
