import express, { Request, Response } from 'express'
import cors from 'cors'

interface MarkerPoint {
  id: string
  memberId: string
  lat: number
  lng: number
  name: string
  stayHours: number
  note: string
  imageColor: string
  imageLabel: string
}

interface RouteResult {
  order: string[]
  totalDistanceKm: number
  totalHours: number
  segments: { from: string; to: string; distanceKm: number }[]
}

interface BudgetResult {
  totalBudget: number
  breakdown: {
    transportation: number
    accommodation: number
    food: number
    activities: number
  }
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function greedyTSP(markers: MarkerPoint[]): RouteResult {
  if (markers.length === 0) {
    return { order: [], totalDistanceKm: 0, totalHours: 0, segments: [] }
  }

  if (markers.length === 1) {
    return {
      order: [markers[0].id],
      totalDistanceKm: 0,
      totalHours: markers[0].stayHours,
      segments: []
    }
  }

  const visited = new Set<string>()
  const order: string[] = []
  const segments: { from: string; to: string; distanceKm: number }[] = []
  let totalDistance = 0
  let totalStayHours = 0

  let current = markers[0]
  visited.add(current.id)
  order.push(current.id)
  totalStayHours += current.stayHours

  while (visited.size < markers.length) {
    let nearest: MarkerPoint | null = null
    let nearestDist = Infinity

    for (const marker of markers) {
      if (visited.has(marker.id)) continue
      const dist = haversineDistance(
        current.lat,
        current.lng,
        marker.lat,
        marker.lng
      )
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = marker
      }
    }

    if (nearest) {
      visited.add(nearest.id)
      order.push(nearest.id)
      segments.push({
        from: current.id,
        to: nearest.id,
        distanceKm: Math.round(nearestDist * 10) / 10
      })
      totalDistance += nearestDist
      totalStayHours += nearest.stayHours
      current = nearest
    }
  }

  const avgSpeedKmh = 60
  const travelHours = totalDistance / avgSpeedKmh
  const totalHours = travelHours + totalStayHours

  return {
    order,
    totalDistanceKm: Math.round(totalDistance * 10) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
    segments
  }
}

function estimateBudget(markers: MarkerPoint[], totalDistanceKm: number, totalHours: number): BudgetResult {
  const days = Math.max(1, Math.ceil(totalHours / 8))
  const count = markers.length

  const transportation = Math.round(totalDistanceKm * 1.2)
  const accommodation = Math.round(days * 350 * Math.max(1, Math.ceil(count / 2)))
  const food = Math.round(days * 150 * count)
  const activities = Math.round(count * 100)

  return {
    totalBudget: transportation + accommodation + food + activities,
    breakdown: { transportation, accommodation, food, activities }
  }
}

app.post('/api/route', (req: Request, res: Response) => {
  try {
    const { markers } = req.body as { markers: MarkerPoint[] }
    if (!markers || !Array.isArray(markers)) {
      return res.status(400).json({ error: 'Invalid markers data' })
    }
    const result = greedyTSP(markers)
    res.json(result)
  } catch (error) {
    console.error('Route calculation error:', error)
    res.status(500).json({ error: 'Failed to calculate route' })
  }
})

app.post('/api/budget', (req: Request, res: Response) => {
  try {
    const { markers, totalDistanceKm, totalHours } = req.body as {
      markers: MarkerPoint[]
      totalDistanceKm: number
      totalHours: number
    }
    if (!markers || !Array.isArray(markers)) {
      return res.status(400).json({ error: 'Invalid markers data' })
    }
    const result = estimateBudget(markers, totalDistanceKm || 0, totalHours || 0)
    res.json(result)
  } catch (error) {
    console.error('Budget estimation error:', error)
    res.status(500).json({ error: 'Failed to estimate budget' })
  }
})

app.listen(PORT, () => {
  console.log(`Travel planning server running on port ${PORT}`)
})
