import { Router, type Request, type Response } from 'express'
import { inspirations, addInspiration } from '../data.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  res.json({ data: inspirations })
})

router.get('/:id', (req: Request, res: Response): void => {
  const item = inspirations.find((i) => i.id === req.params.id)
  if (!item) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({ data: item })
})

router.post('/', (req: Request, res: Response): void => {
  const { title, content, tag, priority } = req.body
  if (!title || !content || !tag || priority === undefined) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  const created = addInspiration({ title, content, tag, priority })
  res.status(201).json({ data: created })
})

export default router
