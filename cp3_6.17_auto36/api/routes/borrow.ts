import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../../data')

const router = Router()

router.post('/borrow', async (req: Request, res: Response): Promise<void> => {
  const { deviceId, userId } = req.body
  if (!deviceId || !userId) {
    res.status(400).json({ success: false, error: 'deviceId and userId are required' })
    return
  }

  const devices = JSON.parse(fs.readFileSync(path.join(dataDir, 'devices.json'), 'utf-8'))
  const device = devices.find((d: any) => d.id === deviceId)
  if (!device) {
    res.status(404).json({ success: false, error: 'Device not found' })
    return
  }
  if (device.status !== 'available') {
    res.status(400).json({ success: false, error: 'Device is not available' })
    return
  }

  const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8'))
  const user = users.find((u: any) => u.id === userId)
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }
  if (user.creditScore < device.creditRequired) {
    res.status(400).json({ success: false, error: 'Insufficient credit score' })
    return
  }

  const records = JSON.parse(fs.readFileSync(path.join(dataDir, 'records.json'), 'utf-8'))
  const newRecord = {
    id: uuidv4(),
    deviceId,
    userId,
    borrowTime: new Date().toISOString(),
    returnTime: null,
    status: 'active',
  }
  records.push(newRecord)

  device.status = 'borrowed'

  fs.writeFileSync(path.join(dataDir, 'records.json'), JSON.stringify(records, null, 2))
  fs.writeFileSync(path.join(dataDir, 'devices.json'), JSON.stringify(devices, null, 2))

  res.json({ success: true, data: newRecord })
})

router.post('/return', async (req: Request, res: Response): Promise<void> => {
  const { recordId } = req.body
  if (!recordId) {
    res.status(400).json({ success: false, error: 'recordId is required' })
    return
  }

  const records = JSON.parse(fs.readFileSync(path.join(dataDir, 'records.json'), 'utf-8'))
  const record = records.find((r: any) => r.id === recordId)
  if (!record) {
    res.status(404).json({ success: false, error: 'Record not found' })
    return
  }
  if (record.status !== 'active') {
    res.status(400).json({ success: false, error: 'Record is not active' })
    return
  }

  const returnTime = new Date()
  const borrowTime = new Date(record.borrowTime)
  const hoursDiff = (returnTime.getTime() - borrowTime.getTime()) / (1000 * 60 * 60)

  record.returnTime = returnTime.toISOString()

  const devices = JSON.parse(fs.readFileSync(path.join(dataDir, 'devices.json'), 'utf-8'))
  const device = devices.find((d: any) => d.id === record.deviceId)
  if (device) {
    device.status = 'available'
  }

  const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8'))
  const user = users.find((u: any) => u.id === record.userId)

  if (hoursDiff > 24) {
    record.status = 'returned_late'
    if (user) {
      user.creditScore = Math.max(0, user.creditScore - 5)
    }
  } else {
    record.status = 'returned_ontime'
    if (user) {
      user.creditScore = Math.min(100, user.creditScore + 1)
    }
  }

  fs.writeFileSync(path.join(dataDir, 'records.json'), JSON.stringify(records, null, 2))
  fs.writeFileSync(path.join(dataDir, 'devices.json'), JSON.stringify(devices, null, 2))
  fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2))

  res.json({ success: true, data: record })
})

export default router
