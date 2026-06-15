import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import type { WeatherArtwork, SaveRequest, SaveResponse, GalleryListResponse, WeatherParams } from '../types'

const app = express()
// 使用3002端口，因为3001端口已被其他服务占用（PID 40704/34548）
const PORT = 3002

app.use(cors())
app.use(express.json({ limit: '50mb' }))

const artworks = new Map<string, WeatherArtwork>()

const generateShareId = (): string => {
  // 使用 UUID v4 生成全局唯一的分享标识符，避免链接被轻易猜测
  return uuidv4()
}

const createSeedArtworks = (): void => {
  const seedPresets: { name: string; params: WeatherParams }[] = [
    { name: '冬日初雪', params: { temperature: -3, humidity: 78, windSpeed: 6, lightLevel: 40, preset: 'blizzard' } },
    { name: '暴雨惊雷', params: { temperature: 20, humidity: 92, windSpeed: 14, lightLevel: 25, preset: 'thunder' } },
    { name: '夏日午后', params: { temperature: 33, humidity: 42, windSpeed: 2, lightLevel: 95, preset: 'clear' } },
    { name: '晨雾朦胧', params: { temperature: 10, humidity: 82, windSpeed: 1, lightLevel: 35, preset: 'mist' } },
    { name: '黄昏余晖', params: { temperature: 19, humidity: 55, windSpeed: 4, lightLevel: 65, preset: 'sunset' } },
    { name: '雨后虹光', params: { temperature: 22, humidity: 70, windSpeed: 5, lightLevel: 80, preset: 'rainbow' } },
    { name: '黄沙漫天', params: { temperature: 36, humidity: 18, windSpeed: 16, lightLevel: 55 } },
    { name: '和风细雨', params: { temperature: 16, humidity: 85, windSpeed: 5, lightLevel: 45 } },
    { name: '秋日暖阳', params: { temperature: 15, humidity: 45, windSpeed: 3, lightLevel: 85, preset: 'clear' } },
    { name: '凛冽寒风', params: { temperature: -8, humidity: 35, windSpeed: 18, lightLevel: 50, preset: 'blizzard' } },
    { name: '雷雨交加', params: { temperature: 25, humidity: 96, windSpeed: 12, lightLevel: 20, preset: 'thunder' } },
    { name: '薄雾晨曦', params: { temperature: 8, humidity: 90, windSpeed: 2, lightLevel: 30, preset: 'mist' } },
    { name: '落日熔金', params: { temperature: 21, humidity: 48, windSpeed: 3, lightLevel: 75, preset: 'sunset' } },
    { name: '七彩虹桥', params: { temperature: 24, humidity: 68, windSpeed: 4, lightLevel: 88, preset: 'rainbow' } },
    { name: '沙尘风暴', params: { temperature: 32, humidity: 12, windSpeed: 20, lightLevel: 40 } },
    { name: '春风化雨', params: { temperature: 14, humidity: 78, windSpeed: 7, lightLevel: 55 } },
    { name: '冰雪奇缘', params: { temperature: -5, humidity: 85, windSpeed: 8, lightLevel: 60, preset: 'blizzard' } },
    { name: '烈日当空', params: { temperature: 38, humidity: 25, windSpeed: 1, lightLevel: 100, preset: 'clear' } },
    { name: '烟雨江南', params: { temperature: 17, humidity: 95, windSpeed: 3, lightLevel: 38, preset: 'mist' } },
    { name: '晚霞满天', params: { temperature: 23, humidity: 50, windSpeed: 6, lightLevel: 70, preset: 'sunset' } },
    { name: '雷暴预警', params: { temperature: 27, humidity: 98, windSpeed: 17, lightLevel: 15, preset: 'thunder' } },
    { name: '微风轻拂', params: { temperature: 25, humidity: 55, windSpeed: 2, lightLevel: 90, preset: 'clear' } },
    { name: '霜降时节', params: { temperature: -1, humidity: 60, windSpeed: 4, lightLevel: 55 } },
    { name: '多云转晴', params: { temperature: 20, humidity: 65, windSpeed: 5, lightLevel: 80 } },
    { name: '烟雨迷蒙', params: { temperature: 12, humidity: 88, windSpeed: 6, lightLevel: 28, preset: 'rainbow' } },
  ]

  seedPresets.forEach((seed, index) => {
    const id = generateShareId()
    const thumbnail = generatePlaceholderThumbnail(seed.params, index)
    artworks.set(id, {
      id,
      params: seed.params,
      thumbnail,
      createdAt: Date.now() - (index + 1) * 3600000,
    })
  })
}

const generatePlaceholderThumbnail = (params: WeatherParams, seed: number): string => {
  const { temperature, humidity, lightLevel } = params
  const tempRatio = (temperature + 10) / 50
  const r = Math.round(10 + tempRatio * 245)
  const g = Math.round(22 + (1 - tempRatio) * 100 + lightLevel * 0.5)
  const b = Math.round(40 + (1 - tempRatio) * 180)
  const alpha = 0.3 + humidity * 0.005

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="g${seed}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:rgba(${r},${g},${b},1)"/>
        <stop offset="100%" style="stop-color:rgba(${Math.round(r*0.6)},${Math.round(g*0.7)},${Math.round(b*0.9)},1)"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#g${seed})"/>
    ${Array.from({ length: 50 }, (_, i) => {
      const cx = (i * 73 + seed * 31) % 400
      const cy = (i * 47 + seed * 23) % 300
      const rad = 1 + (i % 5) * 0.8
      const opacity = alpha * (0.4 + ((i * 13) % 60) / 100)
      return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="rgba(255,255,255,${opacity})"/>`
    }).join('')}
  </svg>`

  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

createSeedArtworks()

app.post('/api/artworks', (req: Request<unknown, SaveResponse, SaveRequest>, res: Response) => {
  try {
    const { params, thumbnail } = req.body

    if (!params || !thumbnail) {
      res.status(400).json({} as SaveResponse)
      return
    }

    const id = generateShareId()
    const artwork: WeatherArtwork = {
      id,
      params,
      thumbnail,
      createdAt: Date.now(),
    }

    artworks.set(id, artwork)

    const host = req.get('host') || 'localhost:5173'
    const protocol = req.protocol || 'http'
    const shareUrl = `${protocol}://${host}/detail/${id}`
    const response: SaveResponse = { id, shareUrl }
    res.status(201).json(response)
  } catch (error) {
    console.error('Save artwork error:', error)
    res.status(500).json({} as SaveResponse)
  }
})

app.get('/api/artworks/:id', (req: Request<{ id: string }>, res: Response<WeatherArtwork | { error: string }>) => {
  try {
    const { id } = req.params
    const artwork = artworks.get(id)

    if (!artwork) {
      res.status(404).json({ error: 'Artwork not found' })
      return
    }

    res.json(artwork)
  } catch (error) {
    console.error('Get artwork error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/artworks', (req: Request, res: Response<GalleryListResponse>) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 15
    const start = (page - 1) * limit
    const end = start + limit

    const artworkList = Array.from(artworks.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    )

    const paginatedArtworks = artworkList.slice(start, end)

    const response: GalleryListResponse = {
      artworks: paginatedArtworks,
      total: artworkList.length,
    }
    res.json(response)
  } catch (error) {
    console.error('Get gallery error:', error)
    res.status(500).json({ artworks: [], total: 0 })
  }
})

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', artworksCount: artworks.size })
})

app.listen(PORT, () => {
  console.log(`🌤️  Weather Dreamweaver API server running on http://localhost:${PORT}`)
})
