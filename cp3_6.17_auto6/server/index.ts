import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 4000
const FPS = 30

const DATA_FILE = path.join(__dirname, 'data.json')
const UPLOADS_DIR = path.join(__dirname, 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

interface Video {
  id: string
  fileName: string
  filePath: string
  duration: number
  fileSize: number
  format: 'mp4' | 'mov'
  thumbnail: string
  createdAt: string
}

interface Marker {
  id: string
  videoId: string
  time: number
  timeFrame: number
  label: string
  labelColor: string
  sortOrder: number
  createdAt: string
}

interface DataStore {
  videos: Video[]
  markers: Marker[]
}

function readData(): DataStore {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw) as DataStore
}

function writeData(data: DataStore): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

app.use(cors())
app.use(express.json({ limit: '300mb' }))
app.use('/uploads', express.static(UPLOADS_DIR))

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.mp4' || ext === '.mov') {
      cb(null, true)
    } else {
      cb(new Error('只支持 MP4/MOV 格式'))
    }
  },
})

app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: '未收到文件' })
  }
  const file = req.file
  const ext = path.extname(file.originalname).toLowerCase()
  const video: Video = {
    id: uuidv4(),
    fileName: file.originalname,
    filePath: `/uploads/${file.filename}`,
    duration: 0,
    fileSize: file.size,
    format: ext === '.mp4' ? 'mp4' : 'mov',
    thumbnail: '',
    createdAt: new Date().toISOString(),
  }
  const data = readData()
  data.videos.push(video)
  writeData(data)
  res.json({ video })
})

app.get('/api/videos', (_req: Request, res: Response) => {
  const data = readData()
  res.json({ videos: data.videos })
})

app.get('/api/videos/:id', (req: Request, res: Response) => {
  const data = readData()
  const video = data.videos.find((v) => v.id === req.params.id)
  if (!video) {
    return res.status(404).json({ error: '视频不存在' })
  }
  res.json({ video })
})

app.put('/api/videos/:id', (req: Request, res: Response) => {
  const { duration, thumbnail } = req.body as { duration?: number; thumbnail?: string }
  const data = readData()
  const video = data.videos.find((v) => v.id === req.params.id)
  if (!video) {
    return res.status(404).json({ error: '视频不存在' })
  }
  if (typeof duration === 'number') video.duration = duration
  if (typeof thumbnail === 'string') video.thumbnail = thumbnail
  writeData(data)
  res.json({ video })
})

app.delete('/api/videos/:id', (req: Request, res: Response) => {
  const data = readData()
  const video = data.videos.find((v) => v.id === req.params.id)
  if (video) {
    const absPath = path.join(UPLOADS_DIR, path.basename(video.filePath))
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath)
    }
  }
  data.videos = data.videos.filter((v) => v.id !== req.params.id)
  data.markers = data.markers.filter((m) => m.videoId !== req.params.id)
  writeData(data)
  res.json({ success: true })
})

app.get('/api/markers', (_req: Request, res: Response) => {
  const data = readData()
  res.json({ markers: data.markers })
})

app.get('/api/markers/:videoId', (req: Request, res: Response) => {
  const data = readData()
  const markers = data.markers.filter((m) => m.videoId === req.params.videoId)
  res.json({ markers })
})

app.post('/api/markers', (req: Request, res: Response) => {
  const { videoId, time, label, labelColor } = req.body as {
    videoId: string
    time: number
    label: string
    labelColor: string
  }
  const data = readData()
  const videoMarkers = data.markers.filter((m) => m.videoId === videoId)
  const sortOrder = videoMarkers.length
  const marker: Marker = {
    id: uuidv4(),
    videoId,
    time,
    timeFrame: Math.round(time * FPS),
    label,
    labelColor,
    sortOrder,
    createdAt: new Date().toISOString(),
  }
  data.markers.push(marker)
  writeData(data)
  res.json({ marker })
})

app.put('/api/markers/:id', (req: Request, res: Response) => {
  const { time, label, labelColor, sortOrder } = req.body as {
    time?: number
    label?: string
    labelColor?: string
    sortOrder?: number
  }
  const data = readData()
  const marker = data.markers.find((m) => m.id === req.params.id)
  if (!marker) {
    return res.status(404).json({ error: '标记不存在' })
  }
  if (typeof time === 'number') {
    marker.time = time
    marker.timeFrame = Math.round(time * FPS)
  }
  if (typeof label === 'string') marker.label = label
  if (typeof labelColor === 'string') marker.labelColor = labelColor
  if (typeof sortOrder === 'number') marker.sortOrder = sortOrder
  writeData(data)
  res.json({ marker })
})

app.delete('/api/markers/:id', (req: Request, res: Response) => {
  const data = readData()
  data.markers = data.markers.filter((m) => m.id !== req.params.id)
  writeData(data)
  res.json({ success: true })
})

app.post('/api/export', (req: Request, res: Response) => {
  const { markerIds } = req.body as { markerIds: string[] }
  const data = readData()
  const selected = data.markers.filter((m) => markerIds.includes(m.id))

  const byVideo = new Map<string, Marker[]>()
  for (const m of selected) {
    if (!byVideo.has(m.videoId)) byVideo.set(m.videoId, [])
    byVideo.get(m.videoId)!.push(m)
  }

  const clips: Array<{
    videoId: string
    videoPath: string
    fileName: string
    startTime: number
    endTime: number
    startFrame: number
    endFrame: number
    label: string
    labelColor: string
    sortOrder: number
  }> = []
  let order = 0

  for (const [videoId, markers] of byVideo) {
    markers.sort((a, b) => a.time - b.time)
    const video = data.videos.find((v) => v.id === videoId)
    if (!video) continue
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i]
      const next = markers[i + 1]
      const endTime = next ? next.time : video.duration
      clips.push({
        videoId,
        videoPath: video.filePath,
        fileName: video.fileName,
        startTime: m.time,
        endTime,
        startFrame: Math.round(m.time * FPS),
        endFrame: Math.round(endTime * FPS),
        label: m.label,
        labelColor: m.labelColor,
        sortOrder: order++,
      })
    }
  }

  res.json({
    timeline: {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clips,
    },
  })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`ClipMarker server running on http://localhost:${PORT}`)
})
