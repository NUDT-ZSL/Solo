import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import type { Capsule, CreateCapsuleRequest } from '../../shared/types.js'

const router = Router()

const capsules: Capsule[] = []

function getColorForDate(targetDate: string): string {
  const now = new Date()
  const target = new Date(targetDate)
  const diffYears = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)
  if (diffYears <= 1) return '#f0c878'
  if (diffYears <= 5) return '#4a9eff'
  return '#9b59b6'
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateSeedData(): void {
  const sampleMessages = [
    { message: "给十年后的自己：希望你还记得现在这份初心，无论世界如何变化，保持善良与勇敢。", years: 10 },
    { message: "亲爱的未来：愿此刻的烦恼都已烟消云散，你依然热爱生活。", years: 5 },
    { message: "一年后的我，生日快乐！希望你已经实现了那个小目标。", years: 1 },
    { message: "致2030年的世界：希望科技让更多人幸福，而不是更孤独。", years: 4 },
    { message: "给五年后的我们：希望我们还在一起，笑着回忆这段时光。", years: 5 },
    { message: "时间会证明一切。三年后的自己，不要放弃。", years: 3 },
    { message: "给未来的孩子：你的父母曾在这里许下心愿，愿你平安喜乐。", years: 8 },
    { message: "2040年，我来了。希望那时候我已经成为想成为的人。", years: 14 },
    { message: "两年后，我一定会站在那个舞台上。这是我对自己的承诺。", years: 2 },
    { message: "亲爱的地球，希望七年后你比现在更绿色、更美好。", years: 7 },
  ]

  sampleMessages.forEach((item, i) => {
    const now = new Date()
    const targetDate = new Date(now.getFullYear() + item.years, now.getMonth(), now.getDate())
    const capsule: Capsule = {
      id: uuidv4(),
      message: item.message,
      targetDate: targetDate.toISOString(),
      createdAt: now.toISOString(),
      status: 'locked',
      color: getColorForDate(targetDate.toISOString()),
      position: {
        x: randomRange(-15, 15),
        y: randomRange(-10, 10),
        z: randomRange(-15, 5),
      },
      rotationSpeed: {
        x: randomRange(0.001, 0.005),
        y: randomRange(0.002, 0.006),
        z: randomRange(0.001, 0.004),
      },
    }
    capsules.push(capsule)
  })
}

generateSeedData()

router.get('/', (_req: Request, res: Response) => {
  res.json(capsules)
})

router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateCapsuleRequest
  if (!body.message || !body.targetDate) {
    res.status(400).json({ error: 'message and targetDate are required' })
    return
  }
  if (body.message.length > 500) {
    res.status(400).json({ error: 'message must be 500 characters or less' })
    return
  }
  const targetDate = new Date(body.targetDate)
  if (targetDate <= new Date()) {
    res.status(400).json({ error: 'targetDate must be in the future' })
    return
  }
  const capsule: Capsule = {
    id: uuidv4(),
    message: body.message,
    attachmentUrl: body.attachmentUrl,
    attachmentType: body.attachmentType,
    targetDate: body.targetDate,
    createdAt: new Date().toISOString(),
    status: 'locked',
    color: getColorForDate(body.targetDate),
    position: {
      x: randomRange(-15, 15),
      y: randomRange(-10, 10),
      z: randomRange(-15, 5),
    },
    rotationSpeed: {
      x: randomRange(0.001, 0.005),
      y: randomRange(0.002, 0.006),
      z: randomRange(0.001, 0.004),
    },
  }
  capsules.push(capsule)
  res.status(201).json(capsule)
})

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const capsule = capsules.find(c => c.id === id)
  if (!capsule) {
    res.status(404).json({ error: 'Capsule not found' })
    return
  }
  if (capsule.status === 'unsealed') {
    res.status(400).json({ error: 'Capsule already unsealed' })
    return
  }
  if (new Date(capsule.targetDate) > new Date()) {
    res.status(400).json({ error: 'Target date not yet reached' })
    return
  }
  capsule.status = 'unsealed'
  res.json({ success: true, capsule })
})

export default router
