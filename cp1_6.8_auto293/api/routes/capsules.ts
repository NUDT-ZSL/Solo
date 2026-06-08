import { Router, type Request, type Response } from 'express'
import {
  getAllCapsules,
  getCapsuleById,
  createCapsule,
  updateCapsule,
  deleteCapsule,
  addFriend,
  generateShareLink,
  getCapsuleByShareId,
  calculateCountdown,
} from '../store.js'

const router = Router()

function buildCapsuleResponse(capsule: ReturnType<typeof getCapsuleById>) {
  if (!capsule) return null
  const countdown = calculateCountdown(capsule)
  const isUnlocked = new Date().getFullYear() >= capsule.unlockYear
  return { capsule, isUnlocked, countdown }
}

router.get('/', (_req: Request, res: Response) => {
  const capsules = getAllCapsules()
  const data = capsules.map(c => buildCapsuleResponse(c))
  res.json({ success: true, data })
})

router.get('/:id', (req: Request, res: Response) => {
  const capsule = getCapsuleById(req.params.id)
  if (!capsule) {
    res.status(404).json({ success: false, error: 'Capsule not found' })
    return
  }
  res.json({ success: true, data: buildCapsuleResponse(capsule) })
})

router.post('/', (req: Request, res: Response) => {
  const { year, title, events, mood, photos, unlockYear, isPublic } = req.body
  if (!title || !unlockYear) {
    res.status(400).json({ success: false, error: 'Title and unlockYear are required' })
    return
  }
  const capsule = createCapsule({
    year: year ?? new Date().getFullYear(),
    title,
    events: events ?? [],
    mood: mood ?? '',
    photos: photos ?? [],
    unlockYear,
    isPublic: isPublic ?? false,
  })
  res.status(201).json({ success: true, data: buildCapsuleResponse(capsule) })
})

router.put('/:id', (req: Request, res: Response) => {
  const capsule = updateCapsule(req.params.id, req.body)
  if (!capsule) {
    res.status(404).json({ success: false, error: 'Capsule not found' })
    return
  }
  res.json({ success: true, data: buildCapsuleResponse(capsule) })
})

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = deleteCapsule(req.params.id)
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Capsule not found' })
    return
  }
  res.json({ success: true, data: null })
})

router.post('/:id/invite', (req: Request, res: Response) => {
  const { email, name } = req.body
  if (!email) {
    res.status(400).json({ success: false, error: 'Email is required' })
    return
  }
  const capsule = addFriend(req.params.id, email, name ?? email.split('@')[0])
  if (!capsule) {
    res.status(404).json({ success: false, error: 'Capsule not found' })
    return
  }
  res.json({ success: true, data: buildCapsuleResponse(capsule) })
})

router.post('/:id/share', (req: Request, res: Response) => {
  const capsule = generateShareLink(req.params.id)
  if (!capsule) {
    res.status(404).json({ success: false, error: 'Capsule not found' })
    return
  }
  res.json({ success: true, data: buildCapsuleResponse(capsule) })
})

router.get('/share/:shareId', (req: Request, res: Response) => {
  const capsule = getCapsuleByShareId(req.params.shareId)
  if (!capsule) {
    res.status(404).json({ success: false, error: 'Capsule not found' })
    return
  }
  res.json({ success: true, data: buildCapsuleResponse(capsule) })
})

export default router
