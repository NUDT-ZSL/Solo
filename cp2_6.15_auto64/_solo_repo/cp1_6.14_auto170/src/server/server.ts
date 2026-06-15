import express from 'express'
import { Request, Response } from 'express'
import {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  Trip,
} from './data-store'

const app = express()
const PORT = 3001

app.use(express.json({ limit: '50mb' }))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

function simulateDelay(): Promise<void> {
  const delay = Math.random() * 50 + 100
  return new Promise(resolve => setTimeout(resolve, delay))
}

app.get('/api/trips', async (req: Request, res: Response) => {
  try {
    await simulateDelay()
    const trips = getTrips()
    res.json(trips)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trips' })
  }
})

app.get('/api/trips/:id', async (req: Request, res: Response) => {
  try {
    await simulateDelay()
    const trip = getTripById(req.params.id)
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' })
    } else {
      res.json(trip)
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trip' })
  }
})

app.post('/api/trips', async (req: Request, res: Response) => {
  try {
    await simulateDelay()
    const { destination, startDate, endDate, budget, mood } = req.body
    if (!destination || !startDate || !endDate || !budget) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const newTrip = createTrip({
      destination,
      startDate,
      endDate,
      budget: Number(budget),
      mood: mood || '',
    })
    res.status(201).json(newTrip)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create trip' })
  }
})

app.put('/api/trips/:id', async (req: Request, res: Response) => {
  try {
    await simulateDelay()
    const updates = req.body as Partial<Trip>
    const updatedTrip = updateTrip(req.params.id, updates)
    if (!updatedTrip) {
      res.status(404).json({ error: 'Trip not found' })
    } else {
      res.json(updatedTrip)
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trip' })
  }
})

app.delete('/api/trips/:id', async (req: Request, res: Response) => {
  try {
    await simulateDelay()
    const deleted = deleteTrip(req.params.id)
    if (!deleted) {
      res.status(404).json({ error: 'Trip not found' })
    } else {
      res.json({ success: true })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete trip' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
