import express from 'express'
import Datastore from 'nedb-promises'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

const db = Datastore.create({
  filename: path.join(__dirname, 'data', 'history.db'),
  autoload: true
})

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

app.post('/api/upload', async (req, res) => {
  try {
    const { fileName, fileData, contours, imageWidth, imageHeight } = req.body

    if (!fileData || !fileName) {
      return res.status(400).json({ error: '缺少文件数据' })
    }

    const matches = fileData.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: '无效的图片格式，仅支持 PNG 或 JPEG' })
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
    const storedName = `${uuidv4()}.${ext}`
    const filePath = path.join(uploadsDir, storedName)

    const buffer = Buffer.from(matches[2], 'base64')
    await fs.promises.writeFile(filePath, buffer)

    const record = {
      _id: uuidv4(),
      originalName: fileName,
      storedPath: `uploads/${storedName}`,
      contours: contours || [],
      imageWidth: imageWidth || 0,
      imageHeight: imageHeight || 0,
      createdAt: Date.now()
    }

    await db.insert(record)

    res.json({
      success: true,
      id: record._id,
      message: '上传成功'
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: '上传失败', message: (err as Error).message })
  }
})

app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '20', 10)
    const records = await db
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)

    res.json({
      success: true,
      data: records
    })
  } catch (err) {
    console.error('History error:', err)
    res.status(500).json({ error: '获取历史记录失败' })
  }
})

app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename)
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath)
  } else {
    res.status(404).json({ error: '文件不存在' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
