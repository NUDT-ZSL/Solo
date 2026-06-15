import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getSnippet, saveSnippet } from '../store.js'
import type { SnippetLanguage } from '../store.js'

const router = Router()

interface CreateSnippetBody {
  title: string
  description: string
  code: string
  language: SnippetLanguage
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { title, description, code, language } = req.body as CreateSnippetBody

  if (!code || !language) {
    res.status(400).json({ error: 'Code and language are required' })
    return
  }

  if (language !== 'javascript' && language !== 'python') {
    res.status(400).json({ error: 'Language must be javascript or python' })
    return
  }

  const id = uuidv4()
  const snippet = {
    id,
    title: title || 'Untitled',
    description: description || '',
    code,
    language,
    createdAt: new Date().toISOString(),
  }

  saveSnippet(snippet)

  res.status(201).json({
    id,
    url: `/snippet/${id}`,
  })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const snippet = getSnippet(id)

  if (!snippet) {
    res.status(404).json({ error: 'Snippet not found' })
    return
  }

  res.json(snippet)
})

export default router
