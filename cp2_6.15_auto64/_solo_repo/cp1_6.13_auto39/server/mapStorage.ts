import Datastore from 'nedb-promises'
import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = Datastore.create({
  filename: path.join(__dirname, 'data', 'maps.db'),
  autoload: true,
})

const router = Router()

interface MapDocument {
  _id: string
  id: string
  name: string
  thumbnail: string
  gridWidth: number
  gridHeight: number
  hexRadius: number
  terrains: Record<string, any>
  units: any[]
  createdAt: string
  updatedAt: string
}

type MapSummary = Pick<MapDocument, 'id' | 'name' | 'thumbnail' | 'createdAt' | 'updatedAt'>

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const maps = await db.find<MapDocument>({}).sort({ updatedAt: -1 }).exec()
    const summaries: MapSummary[] = maps.map((m) => ({
      id: m.id,
      name: m.name,
      thumbnail: m.thumbnail,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }))
    res.status(200).json(summaries)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const map = await db.findOne<MapDocument>({ id: req.params.id })
    if (!map) {
      res.status(404).json({ error: 'Map not found' })
      return
    }
    res.status(200).json(map)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, thumbnail, gridWidth, gridHeight, hexRadius, terrains, units } = req.body
    const now = new Date().toISOString()
    const newMap: MapDocument = {
      _id: uuidv4(),
      id: uuidv4(),
      name,
      thumbnail,
      gridWidth,
      gridHeight,
      hexRadius,
      terrains,
      units,
      createdAt: now,
      updatedAt: now,
    }
    const inserted = await db.insert<MapDocument>(newMap)
    res.status(201).json(inserted)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, thumbnail, terrains, units } = req.body
    const existing = await db.findOne<MapDocument>({ id: req.params.id })
    if (!existing) {
      res.status(404).json({ error: 'Map not found' })
      return
    }
    const now = new Date().toISOString()
    const updated = await db.update<MapDocument>(
      { id: req.params.id },
      {
        $set: {
          name,
          thumbnail,
          terrains,
          units,
          updatedAt: now,
        },
      },
      { returnUpdatedDocs: true },
    )
    res.status(200).json((updated as any).affectedDocuments)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const numRemoved = await db.remove({ id: req.params.id }, {})
    if (numRemoved === 0) {
      res.status(404).json({ error: 'Map not found' })
      return
    }
    res.status(200).json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

export default router
