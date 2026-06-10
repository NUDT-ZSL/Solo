import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import path from 'path'
import { voiceprints } from '../store.js'
import { analyzeSpectrum } from '../services/spectrumAnalyzer.js'

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.wav' || ext === '.mp3') cb(null, true)
    else cb(new Error('Only WAV and MP3 files allowed'))
  }
})

function authMiddleware(req: Request, res: Response, next: Function): void {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    ;(req as any).userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

const router = Router()
router.use(authMiddleware)

router.post('/', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as string
    const file = req.file

    if (!file) {
      res.status(400).json({ error: 'Audio file is required' })
      return
    }

    const spectrum = analyzeSpectrum(file.path)

    const id = uuidv4()
    const voiceprint = {
      id,
      userId,
      filename: file.originalname || file.filename,
      createdAt: new Date().toISOString(),
      spectrum,
      story: '',
      tags: [],
      favorited: false
    }

    voiceprints.set(id, voiceprint)

    res.status(201).json(voiceprint)
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze audio' })
  }
})

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string
  const { search, tag } = req.query

  let results = Array.from(voiceprints.values()).filter(vp => vp.userId === userId)

  if (search && typeof search === 'string') {
    const q = search.toLowerCase()
    results = results.filter(vp =>
      vp.filename.toLowerCase().includes(q) ||
      vp.story.toLowerCase().includes(q) ||
      vp.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  if (tag && typeof tag === 'string') {
    results = results.filter(vp => vp.tags.includes(tag))
  }

  res.json(results)
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string
  const vp = voiceprints.get(req.params.id)

  if (!vp || vp.userId !== userId) {
    res.status(404).json({ error: 'Voiceprint not found' })
    return
  }

  res.json(vp)
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string
  const vp = voiceprints.get(req.params.id)

  if (!vp || vp.userId !== userId) {
    res.status(404).json({ error: 'Voiceprint not found' })
    return
  }

  const { story, tags, favorited } = req.body

  if (story !== undefined) vp.story = story
  if (tags !== undefined) vp.tags = tags
  if (favorited !== undefined) vp.favorited = favorited

  voiceprints.set(req.params.id, vp)

  res.json(vp)
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as string
  const vp = voiceprints.get(req.params.id)

  if (!vp || vp.userId !== userId) {
    res.status(404).json({ error: 'Voiceprint not found' })
    return
  }

  voiceprints.delete(req.params.id)

  res.json({ success: true })
})

export default router
