import express, { Request, Response } from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface Point {
  id: string
  lat: number
  lng: number
  duration: number
}

interface RouteRequest {
  markers: Point[]
}

interface RouteResponse {
  order: string[]
  totalDistance: number
  totalHours: number
  distances: number[]
}

interface BudgetRequest {
  totalDistance: number
  totalHours: number
  markerCount: number
}

interface BudgetResponse {
  transportCost: number
  accommodationCost: number
  foodCost: number
  totalBudget: number
}

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const toRad = (deg: number): number => {
  return deg * (Math.PI / 180)
}

const greedyTSP = (points: Point[]): { order: string[]; distances: number[] } => {
  if (points.length === 0) return { order: [], distances: [] }
  if (points.length === 1) return { order: [points[0].id], distances: [] }

  const unvisited = new Map(points.map((p) => [p.id, p]))
  const order: string[] = []
  const distances: number[] = []

  let current = points[0]
  order.push(current.id)
  unvisited.delete(current.id)

  while (unvisited.size > 0) {
    let nearestId: string | null = null
    let nearestDist = Infinity

    for (const [id, point] of unvisited) {
      const dist = haversineDistance(current.lat, current.lng, point.lat, point.lng)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestId = id
      }
    }

    if (nearestId) {
      order.push(nearestId)
      distances.push(nearestDist)
      current = unvisited.get(nearestId)!
      unvisited.delete(nearestId)
    }
  }

  return { order, distances }
}

const AVG_TRAVEL_SPEED_KMH = 80
const AVG_SLEEP_HOURS_PER_NIGHT = 8

app.post('/api/route', (req: Request, res: Response) => {
  try {
    const { markers } = req.body

    if (!markers || markers.length < 2) {
      res.status(400).json({
        order: [],
        totalDistance: 0,
        totalHours: 0,
        distances: []
      })
      return
    }

    const { order, distances } = greedyTSP(markers)
    const totalDistance = distances.reduce((sum, d) => sum + d, 0)
    const travelHours = totalDistance / AVG_TRAVEL_SPEED_KMH

    const markerDurationMap = new Map(markers.map((m: any) => [m.id, m.duration]))
    let totalStayHours = 0
    for (const id of order) {
      totalStayHours += markerDurationMap.get(id) || 0
    }

    const totalActiveHours = travelHours + totalStayHours
    const nights = Math.max(0, Math.floor(totalActiveHours / 16))
    const totalHours = totalActiveHours + nights * AVG_SLEEP_HOURS_PER_NIGHT

    const response = {
      order,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalHours: Math.round(totalHours * 10) / 10,
      distances: distances.map((d) => Math.round(d * 10) / 10)
    }

    console.log('[server] Route generated:', {
      markers: markers.length,
      totalDistance: response.totalDistance,
      totalHours: response.totalHours
    })

    res.json(response)
  } catch (error) {
    console.error('Route calculation error:', error)
    res.status(500).json({
      order: [],
      totalDistance: 0,
      totalHours: 0,
      distances: []
    })
  }
})

const TRANSPORT_COST_PER_KM = 0.6
const ACCOMMODATION_COST_PER_NIGHT = 300
const FOOD_COST_PER_DAY = 150

app.post('/api/budget', (req: Request, res: Response) => {
  try {
    const { totalDistance, totalHours, markerCount } = req.body

    const transportCost = Math.max(0, totalDistance) * TRANSPORT_COST_PER_KM
    const days = Math.max(1, Math.ceil(totalHours / 24))
    const accommodationCost = Math.max(0, days - 1) * ACCOMMODATION_COST_PER_NIGHT
    const foodCost = days * FOOD_COST_PER_DAY

    const totalBudget = transportCost + accommodationCost + foodCost

    const response = {
      transportCost: Math.round(transportCost * 100) / 100,
      accommodationCost: Math.round(accommodationCost * 100) / 100,
      foodCost: Math.round(foodCost * 100) / 100,
      totalBudget: Math.round(totalBudget * 100) / 100
    }

    console.log('[server] Budget estimated:', response)

    res.json(response)
  } catch (error) {
    console.error('Budget estimation error:', error)
    res.status(500).json({
      transportCost: 0,
      accommodationCost: 0,
      foodCost: 0,
      totalBudget: 0
    })
  }
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

app.listen(PORT, () => {
  console.log(`[server] Travel Map API server running on http://localhost:${PORT}`)
})
