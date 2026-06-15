import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { stores, appointments, members, rooms } from './db.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/stores', async (req, res) => {
  try {
    const allStores = await stores.find({})
    const today = new Date().toISOString().slice(0, 10)
    const result = []
    for (const s of allStores) {
      const todayApts = await appointments.find({ storeId: s._id, date: today })
      const bookedTimes = todayApts.map(a => a.time)
      const allSlots = []
      for (let h = 9; h <= 20; h++) {
        const t = String(h).padStart(2, '0') + ':00'
        allSlots.push({ time: t, available: !bookedTimes.includes(t) })
      }
      result.push({ ...s, todaySlots: allSlots })
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/appointments', async (req, res) => {
  try {
    const { storeId, date, groomerId, status } = req.query
    const query = {}
    if (storeId) query.storeId = storeId
    if (date) query.date = date
    if (groomerId) query.groomerId = groomerId
    if (status) query.status = status
    const result = await appointments.find(query)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/appointments', async (req, res) => {
  try {
    const apt = {
      _id: uuidv4(),
      ...req.body,
      status: 'pending',
      rating: null,
      review: null,
    }
    await appointments.insert(apt)
    res.json(apt)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params
    const update = req.body
    if (update.status === 'completed' && update.rating) {
      const apt = await appointments.findOne({ _id: id })
      if (apt) {
        const ptsEarned = Math.floor(apt.price / 100) * 10
        const member = await members.findOne({ phone: apt.ownerPhone, _collection: { $exists: false } })
        if (member) {
          await members.update(
            { _id: member._id },
            { $inc: { points: ptsEarned } }
          )
          await members.insert({
            _id: uuidv4(),
            memberId: member._id,
            date: new Date().toISOString().slice(0, 10),
            service: apt.service,
            points: ptsEarned,
            type: 'earn',
            _collection: 'pointHistory',
          })
        }
      }
    }
    await appointments.update({ _id: id }, { $set: update })
    const updated = await appointments.findOne({ _id: id })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/members', async (req, res) => {
  try {
    const { phone } = req.query
    const query = { _collection: { $exists: false } }
    if (phone) query.phone = phone
    const result = await members.find(query)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/members/:id/points', async (req, res) => {
  try {
    const { id } = req.params
    const member = await members.findOne({ _id: id, _collection: { $exists: false } })
    if (!member) return res.status(404).json({ error: 'Member not found' })
    const history = await members.find({ memberId: id, _collection: 'pointHistory' })
    res.json({ member, history })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/members/points', async (req, res) => {
  try {
    const { memberId, points, service, type } = req.body
    const member = await members.findOne({ _id: memberId, _collection: { $exists: false } })
    if (!member) return res.status(404).json({ error: 'Member not found' })
    if (type === 'redeem' && member.points < points) {
      return res.status(400).json({ error: '积分不足' })
    }
    const inc = type === 'earn' ? points : -points
    await members.update({ _id: memberId }, { $inc: { points: inc } })
    await members.insert({
      _id: uuidv4(),
      memberId,
      date: new Date().toISOString().slice(0, 10),
      service: service || '兑换',
      points,
      type,
      _collection: 'pointHistory',
    })
    const updated = await members.findOne({ _id: memberId, _collection: { $exists: false } })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/rooms', async (req, res) => {
  try {
    const { storeId } = req.query
    const query = {}
    if (storeId) query.storeId = storeId
    const result = await rooms.find(query)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params
    const update = req.body
    await rooms.update({ _id: id }, { $set: update })
    const updated = await rooms.findOne({ _id: id })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
