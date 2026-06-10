import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import type { WeatherArtwork, SaveRequest, SaveResponse, GalleryListResponse, WeatherParams } from '../types'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

const artworks = new Map<string, WeatherArtwork>()

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
  ]

  seedPresets.forEach((seed, index) => {
    const id = uuidv4()
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

    const id = uuidv4()
    const artwork: WeatherArtwork = {
      id,
      params,
      thumbnail,
      createdAt: Date.now(),
    }

    artworks.set(id, artwork)

    const shareUrl = `${req.protocol}://${req.get('host') || 'localhost:5173'}/detail/${id}`
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

app.get('/api/artworks', (_req: Request, res: Response<GalleryListResponse>) => {
  try {
    const artworkList = Array.from(artworks.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    )
    const response: GalleryListResponse = {
      artworks: artworkList,
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
