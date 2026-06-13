import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import Datastore from 'nedb-promises'
import { v4 as uuidv4 } from 'uuid'
import type { Layer, Marker } from '../shared/types.js'
import {
  LITHOLOGY_COLORS,
  LITHOLOGY_NAMES,
  LITHOLOGY_DESCRIPTIONS,
  ERAS,
  FOSSIL_TYPES,
} from '../shared/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const dbPath = path.join(__dirname, '..', 'data')
const layersDB = Datastore.create(path.join(dbPath, 'layers.db'))
const markersDB = Datastore.create(path.join(dbPath, 'markers.db'))

const generateRandomLayers = (): Layer[] => {
  const lithologyKeys = Object.keys(LITHOLOGY_COLORS)
  const numLayers = Math.floor(Math.random() * 5) + 8
  const layers: Layer[] = []
  let position = 0

  for (let i = 0; i < numLayers; i++) {
    const lithology = lithologyKeys[Math.floor(Math.random() * lithologyKeys.length)]
    const thickness = Math.round((Math.random() * 1.5 + 0.5) * 100) / 100
    const eraIndex = Math.floor((i / (numLayers - 1)) * (ERAS.length - 1))
    const era = ERAS[eraIndex]
    const descriptions = LITHOLOGY_DESCRIPTIONS[lithology]
    const description = descriptions[Math.floor(Math.random() * descriptions.length)]

    const fossilCount = Math.floor(Math.random() * 4)
    const fossils: string[] = []
    for (let j = 0; j < fossilCount; j++) {
      const fossil = FOSSIL_TYPES[Math.floor(Math.random() * FOSSIL_TYPES.length)]
      if (!fossils.includes(fossil)) fossils.push(fossil)
    }

    layers.push({
      id: uuidv4(),
      name: `${era.name}${LITHOLOGY_NAMES[lithology]}层`,
      age: era.name,
      lithology: LITHOLOGY_NAMES[lithology],
      description,
      thickness,
      color: LITHOLOGY_COLORS[lithology],
      fossils,
      position,
      eraIndex,
    })

    position += thickness
  }

  return layers
}

const initializeLayers = async () => {
  const count = await layersDB.count({})
  if (count === 0) {
    const layers = generateRandomLayers()
    await layersDB.insert(layers)
    console.log('Initial layers data created')
  }
}

initializeLayers().catch(console.error)

app.get('/api/layers', async (req: Request, res: Response): Promise<void> => {
  try {
    const layers = await layersDB.find({}).sort({ position: 1 })
    res.status(200).json(layers)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch layers' })
  }
})

app.get('/api/markers', async (req: Request, res: Response): Promise<void> => {
  try {
    const markers = await markersDB.find({}).sort({ createdAt: -1 })
    res.status(200).json(markers)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch markers' })
  }
})

app.post('/api/markers', async (req: Request, res: Response): Promise<void> => {
  try {
    const markerData: Marker = {
      id: uuidv4(),
      position: req.body.position,
      label: req.body.label || '未命名标记',
      layerId: req.body.layerId,
      createdAt: new Date().toISOString(),
    }
    const result = await markersDB.insert(markerData)
    res.status(201).json(result)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save marker' })
  }
})

app.put('/api/markers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await markersDB.findOne({ id: req.params.id })
    if (!existing) {
      res.status(404).json({ success: false, error: 'Marker not found' })
      return
    }
    const updated = {
      ...existing,
      label: req.body.label ?? existing.label,
      position: req.body.position ?? existing.position,
    }
    await markersDB.update({ id: req.params.id }, { $set: updated })
    res.status(200).json(updated)
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update marker' })
  }
})

app.delete('/api/markers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    await markersDB.remove({ id: req.params.id }, {})
    res.status(200).json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete marker' })
  }
})

app.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
