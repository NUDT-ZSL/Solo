import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { exhibitionsDb, feedbacksDb, initDb } from './db/init.js'

const app = express()
const PORT = 3001

app.use(express.json())

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.get('/api/exhibitions', async (req, res) => {
  try {
    const exhibitions = await exhibitionsDb.find({}).sort({ createdAt: -1 })
    const result = exhibitions.map((exh: any) => ({
      id: exh.id,
      name: exh.name,
      startDate: exh.startDate,
      endDate: exh.endDate,
      status: exh.status,
      zones: exh.zones,
      artworkCount: exh.artworks?.length || 0
    }))
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exhibitions' })
  }
})

app.get('/api/exhibitions/:id', async (req, res) => {
  try {
    const exhibition = await exhibitionsDb.findOne({ id: req.params.id })
    if (!exhibition) {
      return res.status(404).json({ error: 'Exhibition not found' })
    }
    res.json(exhibition)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exhibition' })
  }
})

app.post('/api/exhibitions', async (req, res) => {
  try {
    const { name, startDate, endDate, zones } = req.body
    if (!name || !startDate || !endDate || !zones) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const today = new Date().toISOString().split('T')[0]
    let status = 'upcoming'
    if (today >= startDate && today <= endDate) {
      status = 'ongoing'
    } else if (today > endDate) {
      status = 'ended'
    }

    const newExhibition = {
      id: uuidv4(),
      name,
      startDate,
      endDate,
      status,
      zones,
      artworks: [],
      createdAt: new Date().toISOString()
    }

    const inserted = await exhibitionsDb.insert(newExhibition)
    res.status(201).json(inserted)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create exhibition' })
  }
})

app.put('/api/exhibitions/:id', async (req, res) => {
  try {
    const { name, startDate, endDate, zones } = req.body
    const existing = await exhibitionsDb.findOne({ id: req.params.id })
    if (!existing) {
      return res.status(404).json({ error: 'Exhibition not found' })
    }

    const today = new Date().toISOString().split('T')[0]
    let status = 'upcoming'
    const sDate = startDate || existing.startDate
    const eDate = endDate || existing.endDate
    if (today >= sDate && today <= eDate) {
      status = 'ongoing'
    } else if (today > eDate) {
      status = 'ended'
    }

    const updated = await exhibitionsDb.update(
      { id: req.params.id },
      { $set: { name, startDate, endDate, zones, status } },
      { returnUpdatedDocs: true }
    )
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update exhibition' })
  }
})

app.delete('/api/exhibitions/:id', async (req, res) => {
  try {
    const numRemoved = await exhibitionsDb.remove({ id: req.params.id }, {})
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Exhibition not found' })
    }
    await feedbacksDb.remove({ exhibitionId: req.params.id }, { multi: true })
    res.json({ message: 'Exhibition deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete exhibition' })
  }
})

app.get('/api/exhibitions/:id/feedbacks', async (req, res) => {
  try {
    const feedbacks = await feedbacksDb
      .find({ exhibitionId: req.params.id })
      .sort({ createdAt: -1 })
    res.json(feedbacks)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedbacks' })
  }
})

app.post('/api/feedbacks', async (req, res) => {
  try {
    const { exhibitionId, rating, content, visitorName } = req.body
    if (!exhibitionId || !rating || !content) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const newFeedback = {
      id: uuidv4(),
      exhibitionId,
      rating: Number(rating),
      content,
      visitorName: visitorName || '匿名观众',
      createdAt: new Date().toISOString()
    }

    const inserted = await feedbacksDb.insert(newFeedback)
    res.status(201).json(inserted)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create feedback' })
  }
})

app.delete('/api/feedbacks/:id', async (req, res) => {
  try {
    const numRemoved = await feedbacksDb.remove({ id: req.params.id }, {})
    if (numRemoved === 0) {
      return res.status(404).json({ error: 'Feedback not found' })
    }
    res.json({ message: 'Feedback deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete feedback' })
  }
})

async function startServer() {
  await initDb()
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}

startServer()
