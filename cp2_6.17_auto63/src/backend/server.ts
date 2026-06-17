import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { DataStore, Song, City, Tour, TourReport } from '../shared/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, 'data.json')

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

function readData(): DataStore {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw) as DataStore
}

function writeData(data: DataStore) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function broadcast(type: string, payload: any) {
  const message = JSON.stringify({ type, payload })
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message)
    }
  })
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371

  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

app.get('/api/tours', (_req, res) => {
  const data = readData()
  res.json(data.tours)
})

app.get('/api/tours/:id', (req, res) => {
  const data = readData()
  const tour = data.tours.find(t => t.id === req.params.id)
  if (!tour) {
    res.status(404).json({ error: 'Tour not found' })
    return
  }
  const cities = data.cities.filter(c => c.tourId === tour.id)
  res.json({ ...tour, cities })
})

app.post('/api/tours', (req, res) => {
  const data = readData()
  const tour: Tour = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  }
  data.tours.push(tour)
  writeData(data)
  broadcast('tour:created', tour)
  res.status(201).json(tour)
})

app.put('/api/tours/:id', (req, res) => {
  const data = readData()
  const idx = data.tours.findIndex(t => t.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'Tour not found' })
    return
  }
  data.tours[idx] = { ...data.tours[idx], ...req.body }
  writeData(data)
  broadcast('tour:updated', data.tours[idx])
  res.json(data.tours[idx])
})

app.delete('/api/tours/:id', (req, res) => {
  const data = readData()
  data.tours = data.tours.filter(t => t.id !== req.params.id)
  data.cities = data.cities.filter(c => c.tourId !== req.params.id)
  writeData(data)
  broadcast('tour:deleted', req.params.id)
  res.json({ success: true })
})

app.post('/api/tours/:id/cities', (req, res) => {
  const data = readData()
  const city: City = {
    id: uuidv4(),
    tourId: req.params.id,
    songIds: [],
    targetDuration: 90,
    ...req.body
  }
  data.cities.push(city)
  writeData(data)
  broadcast('city:created', city)
  res.status(201).json(city)
})

app.put('/api/tours/:id/cities/:cityId', (req, res) => {
  const data = readData()
  const idx = data.cities.findIndex(c => c.id === req.params.cityId)
  if (idx === -1) {
    res.status(404).json({ error: 'City not found' })
    return
  }
  data.cities[idx] = { ...data.cities[idx], ...req.body }
  writeData(data)
  broadcast('city:updated', data.cities[idx])
  res.json(data.cities[idx])
})

app.delete('/api/tours/:id/cities/:cityId', (req, res) => {
  const data = readData()
  data.cities = data.cities.filter(c => c.id !== req.params.cityId)
  writeData(data)
  broadcast('city:deleted', req.params.cityId)
  res.json({ success: true })
})

app.put('/api/tours/:id/cities/:cityId/songs', (req, res) => {
  const data = readData()
  const idx = data.cities.findIndex(c => c.id === req.params.cityId)
  if (idx === -1) {
    res.status(404).json({ error: 'City not found' })
    return
  }
  data.cities[idx].songIds = req.body.songIds
  writeData(data)
  broadcast('city:songs-updated', data.cities[idx])
  res.json(data.cities[idx])
})

app.get('/api/songs', (_req, res) => {
  const data = readData()
  res.json(data.songs)
})

app.post('/api/songs', (req, res) => {
  const data = readData()
  const song: Song = {
    id: uuidv4(),
    ...req.body
  }
  data.songs.push(song)
  writeData(data)
  broadcast('song:created', song)
  res.status(201).json(song)
})

app.put('/api/songs/:id', (req, res) => {
  const data = readData()
  const idx = data.songs.findIndex(s => s.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'Song not found' })
    return
  }
  data.songs[idx] = { ...data.songs[idx], ...req.body }
  writeData(data)
  broadcast('song:updated', data.songs[idx])
  res.json(data.songs[idx])
})

app.delete('/api/songs/:id', (req, res) => {
  const data = readData()
  data.songs = data.songs.filter(s => s.id !== req.params.id)
  writeData(data)
  broadcast('song:deleted', req.params.id)
  res.json({ success: true })
})

app.get('/api/tours/:id/report', (req, res) => {
  const data = readData()
  const tour = data.tours.find(t => t.id === req.params.id)
  if (!tour) {
    res.status(404).json({ error: 'Tour not found' })
    return
  }

  const cities = data.cities.filter(c => c.tourId === tour.id)
  const songMap = new Map(data.songs.map(s => [s.id, s]))

  let totalDistance = 0
  for (let i = 1; i < cities.length; i++) {
    totalDistance += calculateDistance(
      cities[i - 1].latitude, cities[i - 1].longitude,
      cities[i].latitude, cities[i].longitude
    )
  }

  const totalAudience = cities.reduce((sum, c) => sum + (c.audienceCount || 0), 0)

  const cityReports = cities.map(c => ({
    cityName: c.name,
    audienceCount: c.audienceCount || 0,
    songCount: c.songIds.length
  }))

  const report: TourReport = {
    tourId: tour.id,
    tourName: tour.name,
    totalDistance: Math.round(totalDistance * 100) / 100,
    songChanges: [],
    totalAudience,
    cityReports
  }

  res.json(report)
})

wss.on('connection', (ws) => {
  console.log('WebSocket client connected')
  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

const PORT = 5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
