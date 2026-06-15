import express, { Request, Response } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  generateNoteId, generateKey, encryptContent, decryptContent, calculateExpiryTime, isNoteExpired, isValidText, isValidImageSize
} from './utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Note {
  id: string
  encryptedContent: string
  contentType: 'text' | 'image'
  expiryTime: number
  key: string
  createdAt: number
}

const notes = new Map<string, Note>()

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.post('/api/notes', (req: Request, res: Response) => {
  try {
    const { content, contentType } = req.body

    if (!content || !contentType) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    if (contentType === 'text') {
      if (!isValidText(content)) {
        return res.status(400).json({ error: '文本内容必须在1-2000字之间' })
      }
    } else if (contentType === 'image') {
      const base64Data = content.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      if (!isValidImageSize(buffer.length)) {
        return res.status(400).json({ error: '图片大小必须在0-2MB之间' })
      }
    } else {
      return res.status(400).json({ error: '无效的内容类型' })
    }

    const noteId = generateNoteId()
    const key = generateKey(noteId)
    const encryptedContent = encryptContent(content, key)
    const expiryTime = calculateExpiryTime()

    const note: Note = {
      id: noteId,
      encryptedContent,
      contentType,
      expiryTime,
      key,
      createdAt: Date.now()
    }

    notes.set(noteId, note)

    return res.status(201).json({ id: noteId })
  } catch (error) {
    console.error('创建笔记错误:', error)
    return res.status(500).json({ error: '创建笔记失败' })
  }
})

app.get('/api/notes/:id', (req: Request, res: Response) => {
  try {
    const noteId = req.params.id
    const note = notes.get(noteId)

    if (!note) {
      return res.status(404).json({ error: '笔记不存在或已焚毁' })
    }

    if (isNoteExpired(note.expiryTime)) {
      notes.delete(noteId)
      return res.status(404).json({ error: '笔记已过期焚毁' })
    }

    const decryptedContent = decryptContent(note.encryptedContent, note.key)
    notes.delete(noteId)

    return res.json({
      content: decryptedContent, contentType: note.contentType })
  } catch (error) {
    console.error('获取笔记错误:', error)
    return res.status(500).json({ error: '获取笔记失败' })
  }
})

setInterval(() => {
  const now = Date.now()
  let cleanedCount = 0
  for (const noteId of notes.keys()) {
    const note = notes.get(noteId)
    if (note && now > note.expiryTime) {
      notes.delete(noteId)
      cleanedCount++
    }
  }
  if (cleanedCount > 0) {
    console.log(`[清理任务] 已清理 ${cleanedCount} 个过期笔记`)
  }
}, 60 * 60 * 1000)

app.listen(PORT, () => {
  console.log(`焚笺服务端运行在 http://localhost:${PORT}`)
})
