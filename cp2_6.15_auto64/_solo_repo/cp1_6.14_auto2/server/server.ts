import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { photosDB, memoriesDB, Photo, Memory } from './db'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Photos CRUD
app.get('/api/photos', async (_req, res) => {
  try {
    const photos = await photosDB.find<Photo>({}).sort({ takenAt: 1 })
    res.json(photos)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.get('/api/photos/:id', async (req, res) => {
  try {
    const photo = await photosDB.findOne<Photo>({ id: req.params.id })
    if (!photo) {
      res.status(404).json({ error: 'Photo not found' })
      return
    }
    res.json(photo)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.post('/api/photos', async (req, res) => {
  try {
    const body = req.body as Partial<Photo>
    const photo: Photo = {
      id: body.id || uuidv4(),
      filename: body.filename || '',
      originalName: body.originalName || '',
      dataUrl: body.dataUrl || '',
      latitude: body.latitude,
      longitude: body.longitude,
      takenAt: body.takenAt || new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      exif: body.exif || {}
    }
    const inserted = await photosDB.insert<Photo>(photo)
    res.status(201).json(inserted)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.put('/api/photos/:id', async (req, res) => {
  try {
    const existing = await photosDB.findOne<Photo>({ id: req.params.id })
    if (!existing) {
      res.status(404).json({ error: 'Photo not found' })
      return
    }
    const updateData: Partial<Photo> = req.body
    const updated = await photosDB.update<Photo>(
      { id: req.params.id },
      { $set: updateData },
      { returnUpdatedDocs: true }
    )
    res.json((updated as unknown as { docs: Photo[] }).docs?.[0] || updateData)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.patch('/api/photos/:id/gps', async (req, res) => {
  try {
    const { latitude, longitude } = req.body
    const existing = await photosDB.findOne<Photo>({ id: req.params.id })
    if (!existing) {
      res.status(404).json({ error: 'Photo not found' })
      return
    }
    const result = await photosDB.update<Photo>(
      { id: req.params.id },
      { $set: { latitude, longitude } },
      { returnUpdatedDocs: true }
    )
    res.json({ latitude, longitude, ok: true, doc: (result as unknown as { docs: Photo[] }).docs?.[0] })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.delete('/api/photos/:id', async (req, res) => {
  try {
    const numRemoved = await photosDB.remove({ id: req.params.id }, {})
    await memoriesDB.remove({ photoId: req.params.id }, { multi: true })
    if (numRemoved === 0) {
      res.status(404).json({ error: 'Photo not found' })
      return
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Memories CRUD
app.get('/api/memories', async (_req, res) => {
  try {
    const memories = await memoriesDB.find<Memory>({})
    res.json(memories)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.get('/api/photos/:photoId/memories', async (req, res) => {
  try {
    const memories = await memoriesDB.find<Memory>({ photoId: req.params.photoId })
    res.json(memories)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.post('/api/photos/:photoId/memories', async (req, res) => {
  try {
    const { content } = req.body
    const memory: Memory = {
      id: uuidv4(),
      photoId: req.params.photoId,
      content: content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const inserted = await memoriesDB.insert<Memory>(memory)
    res.status(201).json(inserted)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.put('/api/memories/:id', async (req, res) => {
  try {
    const { content } = req.body
    const existing = await memoriesDB.findOne<Memory>({ id: req.params.id })
    if (!existing) {
      res.status(404).json({ error: 'Memory not found' })
      return
    }
    const result = await memoriesDB.update<Memory>(
      { id: req.params.id },
      { $set: { content, updatedAt: new Date().toISOString() } },
      { returnUpdatedDocs: true }
    )
    res.json((result as unknown as { docs: Memory[] }).docs?.[0])
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.delete('/api/memories/:id', async (req, res) => {
  try {
    const numRemoved = await memoriesDB.remove({ id: req.params.id }, {})
    if (numRemoved === 0) {
      res.status(404).json({ error: 'Memory not found' })
      return
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

app.listen(PORT, () => {
  console.log(`MemoryLens API server running on http://localhost:${PORT}`)
})
