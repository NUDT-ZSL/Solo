import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

interface SoundTrack {
  soundId: string
  name: string
  emoji: string
  volume: number
  muted: boolean
  solo: boolean
}

interface Preset {
  id: string
  name: string
  description: string
  tracks: SoundTrack[]
  masterVolume: number
  createdAt: string
  updatedAt: string
  shareToken?: string
}

const presets: Map<string, Preset> = new Map()

const seedPresets: Preset[] = [
  {
    id: uuidv4(),
    name: '雨天咖啡馆',
    description: '在雨天的咖啡馆里安静工作',
    tracks: [
      { soundId: 'rain', name: '雨声', emoji: '🌧️', volume: 60, muted: false, solo: false },
      { soundId: 'cafe', name: '咖啡馆', emoji: '☕', volume: 45, muted: false, solo: false },
      { soundId: 'fan', name: '风扇', emoji: '🌀', volume: 30, muted: false, solo: false },
    ],
    masterVolume: 80,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shareToken: uuidv4(),
  },
  {
    id: uuidv4(),
    name: '森林清晨',
    description: '在宁静的森林中迎接清晨',
    tracks: [
      { soundId: 'birds', name: '鸟鸣', emoji: '🐦', volume: 55, muted: false, solo: false },
      { soundId: 'forest', name: '森林', emoji: '🌲', volume: 65, muted: false, solo: false },
      { soundId: 'fire', name: '篝火', emoji: '🔥', volume: 25, muted: false, solo: false },
    ],
    masterVolume: 75,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shareToken: uuidv4(),
  },
]

seedPresets.forEach((p) => presets.set(p.id, p))

router.get('/', (req: Request, res: Response) => {
  const list = Array.from(presets.values()).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    trackCount: p.tracks.length,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    tracks: p.tracks,
  }))
  res.json(list)
})

router.get('/:id', (req: Request, res: Response) => {
  const preset = presets.get(req.params.id)
  if (!preset) {
    return res.status(404).json({ error: '预设不存在' })
  }
  res.json(preset)
})

router.post('/', (req: Request, res: Response) => {
  const { name, description, tracks, masterVolume } = req.body

  if (!name || !tracks || !Array.isArray(tracks)) {
    return res.status(400).json({ error: '缺少必要字段' })
  }

  const id = uuidv4()
  const preset: Preset = {
    id,
    name,
    description: description || '',
    tracks,
    masterVolume: masterVolume ?? 80,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shareToken: uuidv4(),
  }

  presets.set(id, preset)
  res.status(201).json(preset)
})

router.put('/:id', (req: Request, res: Response) => {
  const existing = presets.get(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: '预设不存在' })
  }

  const { name, description, tracks, masterVolume } = req.body

  const updated: Preset = {
    ...existing,
    name: name ?? existing.name,
    description: description ?? existing.description,
    tracks: tracks ?? existing.tracks,
    masterVolume: masterVolume ?? existing.masterVolume,
    updatedAt: new Date().toISOString(),
  }

  presets.set(req.params.id, updated)
  res.json(updated)
})

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = presets.delete(req.params.id)
  if (!deleted) {
    return res.status(404).json({ error: '预设不存在' })
  }
  res.json({ success: true })
})

router.post('/:id/share', (req: Request, res: Response) => {
  const preset = presets.get(req.params.id)
  if (!preset) {
    return res.status(404).json({ error: '预设不存在' })
  }

  const shareToken = preset.shareToken || uuidv4()
  preset.shareToken = shareToken
  preset.updatedAt = new Date().toISOString()
  presets.set(req.params.id, preset)

  const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareToken}`
  res.json({ shareUrl, shareToken })
})

router.get('/share/:token', (req: Request, res: Response) => {
  const preset = Array.from(presets.values()).find(
    (p) => p.shareToken === req.params.token
  )
  if (!preset) {
    return res.status(404).json({ error: '分享链接无效或已过期' })
  }
  res.json(preset)
})

export default router
