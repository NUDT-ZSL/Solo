import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '..', 'data')
const commentsFile = path.join(dataDir, 'comments.json')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

interface Comment {
  id: string
  recordId: string
  author: string
  content: string
  createdAt: string
}

function readComments(): Comment[] {
  if (!fs.existsSync(commentsFile)) return []
  const data = fs.readFileSync(commentsFile, 'utf-8')
  return JSON.parse(data)
}

function writeComments(comments: Comment[]): void {
  fs.writeFileSync(commentsFile, JSON.stringify(comments, null, 2), 'utf-8')
}

const router = Router({ mergeParams: true })

router.get('/', (req: Request, res: Response): void => {
  const comments = readComments()
  const recordId = req.params.id
  const filtered = comments.filter((c) => c.recordId === recordId)

  res.json(filtered)
})

router.post('/', (req: Request, res: Response): void => {
  const comments = readComments()
  const recordId = req.params.id
  const { author, content } = req.body

  if (!author || !content) {
    res.status(400).json({ success: false, error: 'Author and content are required' })
    return
  }

  const newComment: Comment = {
    id: uuidv4(),
    recordId,
    author,
    content,
    createdAt: new Date().toISOString(),
  }

  comments.push(newComment)
  writeComments(comments)

  res.status(201).json(newComment)
})

export default router
