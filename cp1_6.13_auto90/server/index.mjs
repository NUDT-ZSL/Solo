import express from 'express'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(express.json())

const GRID_SIZE = 20
const INTERVAL_MS = 2000
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
const MAX_SNAPSHOTS = Math.ceil(TWELVE_HOURS_MS / INTERVAL_MS)

const history = []
let currentData = null
let currentTimestamp = Date.now()

function generateNoiseGrid() {
  const grid = []
  for (let row = 0; row < GRID_SIZE; row++) {
    const row_data = []
    for (let col = 0; col < GRID_SIZE; col++) {
      row_data.push(Math.round(Math.random() * 100))
    }
    grid.push(row_data)
  }
  return grid
}

function generateSnapshot() {
  currentTimestamp = Date.now()
  currentData = generateNoiseGrid()
  history.push({
    timestamp: currentTimestamp,
    gridSize: GRID_SIZE,
    data: currentData,
  })
  if (history.length > MAX_SNAPSHOTS) {
    history.shift()
  }
}

for (let i = 0; i < Math.min(2160, MAX_SNAPSHOTS); i++) {
  const ts = Date.now() - (MAX_SNAPSHOTS - i) * INTERVAL_MS
  const grid = generateNoiseGrid()
  history.push({
    timestamp: ts,
    gridSize: GRID_SIZE,
    data: grid,
  })
}
currentTimestamp = history[history.length - 1].timestamp
currentData = history[history.length - 1].data

setInterval(generateSnapshot, INTERVAL_MS)

app.get('/api/noise-data', (req, res) => {
  const timestamp = req.query.timestamp ? Number(req.query.timestamp) : null

  if (timestamp) {
    let closest = null
    let minDiff = Infinity
    for (const snapshot of history) {
      const diff = Math.abs(snapshot.timestamp - timestamp)
      if (diff < minDiff) {
        minDiff = diff
        closest = snapshot
      }
    }
    if (closest) {
      return res.json(closest)
    }
  }

  res.json({
    timestamp: currentTimestamp,
    gridSize: GRID_SIZE,
    data: currentData,
  })
})

app.get('/api/noise-history-info', (req, res) => {
  res.json({
    totalSnapshots: history.length,
    oldestTimestamp: history.length > 0 ? history[0].timestamp : null,
    newestTimestamp: history.length > 0 ? history[history.length - 1].timestamp : null,
    intervalMs: INTERVAL_MS,
  })
})

app.listen(PORT, () => {
  console.log(`UrbanSoundMap server running on http://localhost:${PORT}`)
})
