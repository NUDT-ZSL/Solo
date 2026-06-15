import { Router, type Request, type Response } from 'express'
import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Datastore({ filename: path.join(__dirname, '../data/colors.db'), autoload: true })
db.ensureIndex({ fieldName: 'userId' })
db.ensureIndex({ fieldName: 'createdAt' })

const router = Router()

router.post('/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, name, colors, harmonyType } = req.body
    const doc = await db.insert({
      _id: uuidv4(),
      userId,
      name,
      colors,
      harmonyType: harmonyType || 'complementary',
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    res.json({ success: true, data: doc })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save color scheme' })
  }
})

router.get('/history/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const docs = await db.find({ userId: req.params.userId }).sort({ createdAt: -1 })
    res.json({ success: true, data: docs })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch history' })
  }
})

router.get('/favorites/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const docs = await db.find({ userId: req.params.userId, isFavorite: true }).sort({ createdAt: -1 })
    res.json({ success: true, data: docs })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch favorites' })
  }
})

router.post('/favorite', async (req: Request, res: Response): Promise<void> => {
  try {
    const { _id, isFavorite } = req.body
    const existing = await db.findOne({ _id })
    if (!existing) {
      res.status(404).json({ success: false, error: 'Color scheme not found' })
      return
    }
    const updatedDoc = await db.update({ _id }, { $set: { isFavorite, updatedAt: Date.now() } }, { returnUpdatedDocs: true })
    res.json({ success: true, data: updatedDoc })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update favorite' })
  }
})

router.delete('/:schemeId', async (req: Request, res: Response): Promise<void> => {
  try {
    await db.remove({ _id: req.params.schemeId })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete color scheme' })
  }
})

export default router
