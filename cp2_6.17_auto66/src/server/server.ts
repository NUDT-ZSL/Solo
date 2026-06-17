import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3002

const DATA_DIR = path.join(__dirname, 'data')
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads')
const ARTWORKS_FILE = path.join(DATA_DIR, 'artworks.json')
const STATS_FILE = path.join(DATA_DIR, 'stats.json')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('仅支持 JPG/PNG 格式'))
  }
})

interface Artwork {
  id: string
  title: string
  artist: string
  category: 'painting' | 'sculpture' | 'photography' | 'digital'
  price: number
  description: string
  coverImage: string
  status: 'onsale' | 'sold'
  createdAt: string
}

interface ArtworkStatsItem {
  views: number
  likes: number
  favorites: number
}

interface ViewRecord {
  id: string
  artworkId: string
  visitorId: string
  timestamp: string
  source: string
}

interface StatsData {
  artworkStats: Record<string, ArtworkStatsItem>
  viewRecords: ViewRecord[]
  userLikes: Record<string, string[]>
  userFavorites: Record<string, string[]>
}

function readArtworks(): { artworks: Artwork[] } {
  return JSON.parse(fs.readFileSync(ARTWORKS_FILE, 'utf-8'))
}

function writeArtworks(data: { artworks: Artwork[] }) {
  fs.writeFileSync(ARTWORKS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function readStats(): StatsData {
  return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'))
}

function writeStats(data: StatsData) {
  fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function ensureStats(artworkId: string, stats: StatsData): ArtworkStatsItem {
  if (!stats.artworkStats[artworkId]) {
    stats.artworkStats[artworkId] = { views: 0, likes: 0, favorites: 0 }
  }
  return stats.artworkStats[artworkId]
}

app.get('/api/artworks', (_req, res) => {
  const { artworks } = readArtworks()
  const stats = readStats()
  const onsale = artworks.filter(a => a.status === 'onsale').map(a => ({
    ...a,
    ...ensureStats(a.id, stats)
  }))
  res.json(onsale)
})

app.get('/api/artworks/:id', (req, res) => {
  const { artworks } = readArtworks()
  const stats = readStats()
  const artwork = artworks.find(a => a.id === req.params.id)
  if (!artwork) return res.status(404).json({ error: '作品不存在' })
  res.json({ ...artwork, ...ensureStats(artwork.id, stats) })
})

app.post('/api/artworks', upload.single('image'), (req, res) => {
  const { title, artist, category, price, description } = req.body
  if (!title || !artist || !category || !price || !description) {
    return res.status(400).json({ error: '缺少必填字段' })
  }
  let coverImage = ''
  if (req.file) {
    coverImage = `/uploads/${req.file.filename}`
  } else {
    coverImage = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(title + ' ' + category + ' art masterpiece gallery quality')}&image_size=landscape_4_3`
  }
  const newArtwork: Artwork = {
    id: `art-${uuidv4().slice(0, 8)}`,
    title,
    artist,
    category: category as Artwork['category'],
    price: Number(price),
    description,
    coverImage,
    status: 'onsale',
    createdAt: new Date().toISOString()
  }
  const data = readArtworks()
  data.artworks.unshift(newArtwork)
  writeArtworks(data)
  const stats = readStats()
  ensureStats(newArtwork.id, stats)
  writeStats(stats)
  res.json(newArtwork)
})

app.post('/api/artworks/:id/like', (req, res) => {
  const { visitorId } = req.body || { visitorId: 'anonymous' }
  const stats = readStats()
  const artworkStats = ensureStats(req.params.id, stats)
  if (!stats.userLikes[visitorId]) stats.userLikes[visitorId] = []
  const idx = stats.userLikes[visitorId].indexOf(req.params.id)
  let liked: boolean
  if (idx >= 0) {
    stats.userLikes[visitorId].splice(idx, 1)
    artworkStats.likes = Math.max(0, artworkStats.likes - 1)
    liked = false
  } else {
    stats.userLikes[visitorId].push(req.params.id)
    artworkStats.likes += 1
    liked = true
  }
  writeStats(stats)
  res.json({ liked, likes: artworkStats.likes })
})

app.post('/api/artworks/:id/favorite', (req, res) => {
  const { visitorId } = req.body || { visitorId: 'anonymous' }
  const stats = readStats()
  const artworkStats = ensureStats(req.params.id, stats)
  if (!stats.userFavorites[visitorId]) stats.userFavorites[visitorId] = []
  const idx = stats.userFavorites[visitorId].indexOf(req.params.id)
  let favorited: boolean
  if (idx >= 0) {
    stats.userFavorites[visitorId].splice(idx, 1)
    artworkStats.favorites = Math.max(0, artworkStats.favorites - 1)
    favorited = false
  } else {
    stats.userFavorites[visitorId].push(req.params.id)
    artworkStats.favorites += 1
    favorited = true
  }
  writeStats(stats)
  res.json({ favorited, favorites: artworkStats.favorites })
})

app.post('/api/artworks/:id/view', (req, res) => {
  const { visitorId = 'anonymous', source = '直接访问' } = req.body || {}
  const stats = readStats()
  const artworkStats = ensureStats(req.params.id, stats)
  artworkStats.views += 1
  const record: ViewRecord = {
    id: `v-${uuidv4().slice(0, 8)}`,
    artworkId: req.params.id,
    visitorId,
    timestamp: new Date().toISOString(),
    source
  }
  stats.viewRecords.unshift(record)
  writeStats(stats)
  res.json(record)
})

app.get('/api/artworks/:id/views', (req, res) => {
  const stats = readStats()
  const records = stats.viewRecords
    .filter(r => r.artworkId === req.params.id)
    .slice(0, 5)
  res.json(records)
})

app.get('/api/analytics', (_req, res) => {
  const { artworks } = readArtworks()
  const stats = readStats()

  const categories: Artwork['category'][] = ['painting', 'sculpture', 'photography', 'digital']
  const categoryNames: Record<string, string> = {
    painting: '绘画',
    sculpture: '雕塑',
    photography: '摄影',
    digital: '数字艺术'
  }
  const categoryStats = categories.map(cat => {
    const catArtworks = artworks.filter(a => a.category === cat)
    const views = catArtworks.reduce((sum, a) => sum + (stats.artworkStats[a.id]?.views || 0), 0)
    return { category: categoryNames[cat], categoryKey: cat, views }
  })

  const now = new Date()
  const hourlyStats = []
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hourStr = `${hour.getHours().toString().padStart(2, '0')}:00`
    const hourStart = new Date(hour)
    hourStart.setMinutes(0, 0, 0)
    const hourEnd = new Date(hour)
    hourEnd.setMinutes(59, 59, 999)
    const views = stats.viewRecords.filter(r => {
      const t = new Date(r.timestamp).getTime()
      return t >= hourStart.getTime() && t <= hourEnd.getTime()
    }).length
    const simulated = views + Math.floor(Math.random() * 8) + 2
    hourlyStats.push({ hour: hourStr, views: simulated })
  }

  res.json({ categoryStats, hourlyStats })
})

app.get('/api/artists', (_req, res) => {
  const { artworks } = readArtworks()
  const artists = [...new Set(artworks.map(a => a.artist))]
  res.json(artists)
})

app.get('/api/artists/:name/works', (req, res) => {
  const { artworks } = readArtworks()
  const stats = readStats()
  const artistName = decodeURIComponent(req.params.name)
  const works = artworks
    .filter(a => a.artist === artistName)
    .map(a => ({
      ...a,
      ...ensureStats(a.id, stats)
    }))
    .sort((a, b) => b.views - a.views)
  res.json(works)
})

app.get('/api/user/:visitorId/state', (req, res) => {
  const stats = readStats()
  const { visitorId } = req.params
  res.json({
    likedArtworks: stats.userLikes[visitorId] || [],
    favoritedArtworks: stats.userFavorites[visitorId] || []
  })
})

app.listen(PORT, () => {
  console.log(`Art Marketplace API server running on http://localhost:${PORT}`)
})
