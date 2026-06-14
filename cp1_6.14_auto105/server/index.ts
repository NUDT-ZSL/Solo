import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { devices, reservations, type Device, type Reservation } from './deviceModel.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/devices', (_req: Request, res: Response) => {
  res.json({ success: true, data: devices })
})

app.put('/api/devices/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const idx = devices.findIndex(d => d.id === id)
  if (idx === -1) {
    res.status(404).json({ success: false, message: '设备不存在' })
    return
  }
  const { name, description, status, imageUrl } = req.body
  if (name !== undefined) devices[idx].name = name
  if (description !== undefined) devices[idx].description = description
  if (status !== undefined) devices[idx].status = status as Device['status']
  if (imageUrl !== undefined) devices[idx].imageUrl = imageUrl
  res.json({ success: true, data: devices[idx] })
})

app.post('/api/reservations', (req: Request, res: Response) => {
  const { deviceId, userId, userName, date, timeSlot, note } = req.body
  const device = devices.find(d => d.id === deviceId)
  if (!device) {
    res.status(404).json({ success: false, message: '设备不存在' })
    return
  }
  const conflict = reservations.find(
    r => r.deviceId === deviceId && r.date === date && r.timeSlot === timeSlot && r.status !== 'rejected'
  )
  if (conflict) {
    res.status(409).json({ success: false, message: '该设备在该时间段已被预约' })
    return
  }
  const reservation: Reservation = {
    id: uuidv4(),
    deviceId,
    deviceName: device.name,
    userId,
    userName,
    date,
    timeSlot,
    note: note || '',
    status: 'pending',
    createdAt: Date.now()
  }
  reservations.push(reservation)
  res.status(201).json({ success: true, data: reservation })
})

app.get('/api/reservations/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params
  const userReservations = reservations
    .filter(r => r.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
  res.json({ success: true, data: userReservations })
})

app.delete('/api/reservations/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const idx = reservations.findIndex(r => r.id === id)
  if (idx === -1) {
    res.status(404).json({ success: false, message: '预约不存在' })
    return
  }
  reservations.splice(idx, 1)
  res.json({ success: true, message: '预约已取消' })
})

app.put('/api/reservations/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params
  const r = reservations.find(r => r.id === id)
  if (!r) {
    res.status(404).json({ success: false, message: '预约不存在' })
    return
  }
  r.status = 'approved'
  const device = devices.find(d => d.id === r.deviceId)
  if (device) device.status = 'borrowed'
  res.json({ success: true, data: r })
})

app.put('/api/reservations/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params
  const r = reservations.find(r => r.id === id)
  if (!r) {
    res.status(404).json({ success: false, message: '预约不存在' })
    return
  }
  r.status = 'rejected'
  res.json({ success: true, data: r })
})

app.get('/api/reservations/pending', (_req: Request, res: Response) => {
  const pending = reservations
    .filter(r => r.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt)
  res.json({ success: true, data: pending })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`InvenTree server running on port ${PORT}`)
})
