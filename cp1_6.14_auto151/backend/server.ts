import express from 'express'
import fs from 'fs'
import path from 'path'
import cors from 'cors'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, 'data')

app.use(cors())
app.use(express.json())

function readJSON(filename: string): any[] {
  const filePath = path.join(DATA_DIR, filename)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw)
}

function writeJSON(filename: string, data: any[]): void {
  const filePath = path.join(DATA_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

app.get('/api/artworks', async (_req, res) => {
  await delay(200)
  const artworks = readJSON('artworks.json')
  res.json(artworks)
})

app.get('/api/artworks/:id', async (req, res) => {
  await delay(200)
  const artworks = readJSON('artworks.json')
  const artwork = artworks.find((a: any) => a.id === req.params.id)
  if (!artwork) {
    return res.status(404).json({ error: 'Artwork not found' })
  }
  res.json(artwork)
})

app.post('/api/artworks', async (req, res) => {
  await delay(200)
  const artworks = readJSON('artworks.json')
  const newArtwork = {
    id: 'w' + Date.now(),
    favorites: 0,
    sold: false,
    createdAt: new Date().toISOString().split('T')[0],
    ...req.body,
  }
  artworks.push(newArtwork)
  writeJSON('artworks.json', artworks)
  res.status(201).json(newArtwork)
})

app.put('/api/artworks/:id', async (req, res) => {
  await delay(200)
  const artworks = readJSON('artworks.json')
  const index = artworks.findIndex((a: any) => a.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Artwork not found' })
  }
  artworks[index] = { ...artworks[index], ...req.body }
  writeJSON('artworks.json', artworks)
  res.json(artworks[index])
})

app.delete('/api/artworks/:id', async (req, res) => {
  await delay(200)
  const artworks = readJSON('artworks.json')
  const filtered = artworks.filter((a: any) => a.id !== req.params.id)
  if (filtered.length === artworks.length) {
    return res.status(404).json({ error: 'Artwork not found' })
  }
  writeJSON('artworks.json', filtered)
  res.json({ success: true })
})

app.post('/api/artworks/:id/favorite', async (req, res) => {
  await delay(200)
  const artworks = readJSON('artworks.json')
  const artwork = artworks.find((a: any) => a.id === req.params.id)
  if (!artwork) {
    return res.status(404).json({ error: 'Artwork not found' })
  }
  const { increment } = req.body
  artwork.favorites += increment ? 1 : -1
  if (artwork.favorites < 0) artwork.favorites = 0
  writeJSON('artworks.json', artworks)
  res.json(artwork)
})

app.get('/api/artists', async (_req, res) => {
  await delay(200)
  const artists = readJSON('artists.json')
  res.json(artists)
})

app.get('/api/artists/:id', async (req, res) => {
  await delay(200)
  const artists = readJSON('artists.json')
  const artist = artists.find((a: any) => a.id === req.params.id)
  if (!artist) {
    return res.status(404).json({ error: 'Artist not found' })
  }
  const artworks = readJSON('artworks.json')
  const purchases = readJSON('purchases.json')
  const artistArtworks = artworks.filter((w: any) => w.artistId === artist.id)
  const totalFavorites = artistArtworks.reduce((sum: number, w: any) => sum + w.favorites, 0)
  const artistArtworkIds = artistArtworks.map((w: any) => w.id)
  const totalSales = purchases.filter((p: any) => artistArtworkIds.includes(p.artworkId))
  const totalRevenue = totalSales.reduce((sum: number, p: any) => sum + p.price, 0)
  res.json({
    ...artist,
    stats: {
      totalWorks: artistArtworks.length,
      totalFavorites,
      totalSales: totalSales.length,
      totalRevenue,
    },
  })
})

app.post('/api/artists', async (req, res) => {
  await delay(200)
  const artists = readJSON('artists.json')
  const newArtist = {
    id: 'a' + Date.now(),
    createdAt: new Date().toISOString().split('T')[0],
    ...req.body,
  }
  artists.push(newArtist)
  writeJSON('artists.json', artists)
  res.status(201).json(newArtist)
})

app.get('/api/purchases', async (_req, res) => {
  await delay(200)
  const purchases = readJSON('purchases.json')
  res.json(purchases)
})

app.post('/api/purchases', async (req, res) => {
  await delay(200)
  const purchases = readJSON('purchases.json')
  const artworks = readJSON('artworks.json')
  const { artworkId, buyerId } = req.body

  const artwork = artworks.find((a: any) => a.id === artworkId)
  if (!artwork) {
    return res.status(404).json({ error: 'Artwork not found' })
  }
  if (artwork.sold) {
    return res.status(400).json({ error: 'Artwork already sold' })
  }

  artwork.sold = true
  writeJSON('artworks.json', artworks)

  const purchase = {
    id: 'p' + Date.now(),
    artworkId,
    buyerId,
    price: artwork.price,
    artistId: artwork.artistId,
    purchasedAt: new Date().toISOString().split('T')[0],
  }
  purchases.push(purchase)
  writeJSON('purchases.json', purchases)
  res.status(201).json(purchase)
})

app.get('/api/rankings/artists', async (_req, res) => {
  const artists = readJSON('artists.json')
  const artworks = readJSON('artworks.json')
  const purchases = readJSON('purchases.json')

  const ranked = artists.map((artist: any) => {
    const artistWorks = artworks.filter((w: any) => w.artistId === artist.id)
    const totalFavorites = artistWorks.reduce((sum: number, w: any) => sum + w.favorites, 0)
    const artistWorkIds = artistWorks.map((w: any) => w.id)
    const totalPurchases = purchases.filter((p: any) => artistWorkIds.includes(p.artworkId)).length
    const heat = totalFavorites + totalPurchases * 5
    return { ...artist, heat }
  })

  ranked.sort((a: any, b: any) => b.heat - a.heat)
  res.json(ranked)
})

app.get('/api/rankings/artworks', async (_req, res) => {
  const artworks = readJSON('artworks.json')
  const ranked = artworks
    .filter((a: any) => !a.sold)
    .sort((a: any, b: any) => b.favorites - a.favorites)
  res.json(ranked)
})

app.listen(PORT, () => {
  console.log(`ArtMarketplace backend running at http://localhost:${PORT}`)
})
