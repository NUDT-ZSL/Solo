import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Video, Marker } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 4000
const DATA_FILE = path.join(__dirname, 'data.json')
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.mp4' || ext === '.mov') {
      cb(null, true)
    } else {
      cb(new Error('仅支持 MP4/MOV 格式'))
    }
  },
})

function readData(): { videos: Video[]; markers: Marker[] } {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { videos: [], markers: [] }
  }
}

function writeData(data: { videos: Video[]; markers: Marker[] }) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    // 简单估算：使用文件大小和比特率估算
    // 实际项目中可以使用 ffprobe 等工具
    // 这里返回一个默认值，让前端加载时会获取真实时长
    resolve(0)
  })
}

app.post('/api/videos', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传视频文件' })
      return
    }

    const data = readData()
    const fileSize = req.file.size
    const filePath = `/uploads/${req.file.filename}`

    const video: Video = {
      id: uuidv4(),
      fileName: req.file.originalname,
      duration: 0,
      fileSize,
      filePath,
      thumbnailPath: filePath,
      createdAt: new Date().toISOString(),
    }

    data.videos.push(video)
    writeData(data)

    res.json(video)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '上传失败' })
  }
})

app.get('/api/videos', (req, res) => {
  const data = readData()
  res.json(data.videos)
})

app.get('/api/videos/:id', (req, res) => {
  const data = readData()
  const video = data.videos.find((v) => v.id === req.params.id)
  if (!video) {
    res.status(404).json({ error: '视频不存在' })
    return
  }
  res.json(video)
})

app.put('/api/videos/:id/duration', (req, res) => {
  const { duration } = req.body
  const data = readData()
  const idx = data.videos.findIndex((v) => v.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: '视频不存在' })
    return
  }
  data.videos[idx].duration = duration
  writeData(data)
  res.json(data.videos[idx])
})

app.get('/api/markers', (req, res) => {
  const { videoId } = req.query
  const data = readData()
  let markers = data.markers
  if (videoId) {
    markers = markers.filter((m) => m.videoId === videoId)
  }
  res.json(markers)
})

app.post('/api/markers', (req, res) => {
  const { videoId, timestamp, label, labelColor } = req.body

  if (!videoId || timestamp === undefined || !label) {
    res.status(400).json({ error: '缺少必要参数' })
    return
  }

  const data = readData()

  const videoMarkers = data.markers.filter((m) => m.videoId === videoId)
  const maxOrder = videoMarkers.length > 0
    ? Math.max(...videoMarkers.map((m) => m.order))
    : -1

  const marker: Marker = {
    id: uuidv4(),
    videoId,
    timestamp: Number(timestamp),
    label,
    labelColor: labelColor || '#ff5722',
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  }

  data.markers.push(marker)
  writeData(data)

  res.json(marker)
})

app.put('/api/markers/:id', (req, res) => {
  const { timestamp, label, labelColor, order } = req.body
  const data = readData()
  const idx = data.markers.findIndex((m) => m.id === req.params.id)

  if (idx === -1) {
    res.status(404).json({ error: '标记不存在' })
    return
  }

  if (timestamp !== undefined) data.markers[idx].timestamp = Number(timestamp)
  if (label !== undefined) data.markers[idx].label = label
  if (labelColor !== undefined) data.markers[idx].labelColor = labelColor
  if (order !== undefined) data.markers[idx].order = Number(order)

  writeData(data)
  res.json(data.markers[idx])
})

app.put('/api/markers/:id/reorder', (req, res) => {
  const { newOrder } = req.body
  const data = readData()
  const marker = data.markers.find((m) => m.id === req.params.id)

  if (!marker) {
    res.status(404).json({ error: '标记不存在' })
    return
  }

  const videoMarkers = data.markers
    .filter((m) => m.videoId === marker.videoId)
    .sort((a, b) => a.order - b.order)

  const oldIndex = videoMarkers.findIndex((m) => m.id === marker.id)
  const targetIndex = Math.max(0, Math.min(videoMarkers.length - 1, Number(newOrder)))

  if (oldIndex === targetIndex) {
    res.json(videoMarkers)
    return
  }

  videoMarkers.splice(oldIndex, 1)
  videoMarkers.splice(targetIndex, 0, marker)

  videoMarkers.forEach((m, i) => {
    m.order = i
  })

  data.markers = data.markers.map((m) => {
    const found = videoMarkers.find((vm) => vm.id === m.id)
    return found || m
  })

  writeData(data)
  res.json(videoMarkers)
})

app.delete('/api/markers/:id', (req, res) => {
  const data = readData()
  const idx = data.markers.findIndex((m) => m.id === req.params.id)

  if (idx === -1) {
    res.status(404).json({ error: '标记不存在' })
    return
  }

  data.markers.splice(idx, 1)
  writeData(data)

  res.json({ success: true })
})

app.delete('/api/videos/:id', (req, res) => {
  const data = readData()
  const videoIdx = data.videos.findIndex((v) => v.id === req.params.id)

  if (videoIdx === -1) {
    res.status(404).json({ error: '视频不存在' })
    return
  }

  const video = data.videos[videoIdx]
  const filePath = path.join(__dirname, '..', video.filePath)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  data.videos.splice(videoIdx, 1)
  data.markers = data.markers.filter((m) => m.videoId !== req.params.id)
  writeData(data)

  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
