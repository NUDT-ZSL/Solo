import express, { Request, Response } from 'express'
import Datastore from 'nedb-promises'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

const dbDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const plantsDB = Datastore.create({
  filename: path.join(dbDir, 'plants.db'),
  autoload: true
})

const operationsDB = Datastore.create({
  filename: path.join(dbDir, 'operations.db'),
  autoload: true
})

const photosDir = path.join(__dirname, '..', 'uploads', 'photos')
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true })
}

export type PlantLocation = 'indoor' | 'balcony' | 'garden'
export type PlantStatus = 'healthy' | 'thirsty' | 'hungry' | 'sick'
export type OperationType = 'water' | 'fertilize' | 'repot' | 'prune' | 'other'

export interface Plant {
  _id?: string
  name: string
  variety: string
  plantDate: string
  location: PlantLocation
  status: PlantStatus
  createdAt: string
  updatedAt: string
  coverPhoto?: string
}

export interface Operation {
  _id?: string
  plantId: string
  type: OperationType
  note?: string
  date: string
  createdAt: string
}

export interface Photo {
  _id?: string
  plantId: string
  dataUrl: string
  date: string
  createdAt: string
}

const photosDB: Photo[] = []

app.get('/api/plants', async (req: Request, res: Response) => {
  try {
    const plants = await plantsDB.find({}).sort({ createdAt: -1 })
    res.json(plants)
  } catch (err) {
    res.status(500).json({ error: '获取植物列表失败' })
  }
})

app.get('/api/plants/:id', async (req: Request, res: Response) => {
  try {
    const plant = await plantsDB.findOne({ _id: req.params.id })
    if (!plant) {
      return res.status(404).json({ error: '植物不存在' })
    }
    res.json(plant)
  } catch (err) {
    res.status(500).json({ error: '获取植物信息失败' })
  }
})

app.post('/api/plants', async (req: Request, res: Response) => {
  try {
    const { name, variety, plantDate, location, coverPhoto } = req.body
    if (!name || !variety || !plantDate || !location) {
      return res.status(400).json({ error: '缺少必填字段' })
    }
    const now = new Date().toISOString()
    const plant: Plant = {
      name,
      variety,
      plantDate,
      location,
      status: 'healthy',
      coverPhoto,
      createdAt: now,
      updatedAt: now
    }
    const result = await plantsDB.insert(plant)
    res.status(201).json(result)
  } catch (err) {
    res.status(500).json({ error: '创建植物失败' })
  }
})

app.put('/api/plants/:id', async (req: Request, res: Response) => {
  try {
    const { name, variety, plantDate, location, status, coverPhoto } = req.body
    const now = new Date().toISOString()
    const updateData: Partial<Plant> = { updatedAt: now }
    if (name !== undefined) updateData.name = name
    if (variety !== undefined) updateData.variety = variety
    if (plantDate !== undefined) updateData.plantDate = plantDate
    if (location !== undefined) updateData.location = location
    if (status !== undefined) updateData.status = status
    if (coverPhoto !== undefined) updateData.coverPhoto = coverPhoto

    const result = await plantsDB.update({ _id: req.params.id }, { $set: updateData }, { returnUpdatedDocs: true })
    if (!result) {
      return res.status(404).json({ error: '植物不存在' })
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: '更新植物失败' })
  }
})

app.delete('/api/plants/:id', async (req: Request, res: Response) => {
  try {
    const numRemoved = await plantsDB.remove({ _id: req.params.id }, {})
    if (numRemoved === 0) {
      return res.status(404).json({ error: '植物不存在' })
    }
    await operationsDB.remove({ plantId: req.params.id }, { multi: true })
    const idx = photosDB.findIndex(p => p.plantId === req.params.id)
    if (idx > -1) photosDB.splice(idx, 1)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: '删除植物失败' })
  }
})

app.get('/api/operations', async (req: Request, res: Response) => {
  try {
    const { plantId, startDate, endDate } = req.query as { plantId?: string; startDate?: string; endDate?: string }
    const query: any = {}
    if (plantId) query.plantId = plantId
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = startDate
      if (endDate) query.date.$lte = endDate
    }
    const operations = await operationsDB.find(query).sort({ date: -1 })
    res.json(operations)
  } catch (err) {
    res.status(500).json({ error: '获取操作记录失败' })
  }
})

app.post('/api/operations', async (req: Request, res: Response) => {
  try {
    const { plantId, type, note, date } = req.body
    if (!plantId || !type || !date) {
      return res.status(400).json({ error: '缺少必填字段' })
    }
    const now = new Date().toISOString()
    const operation: Operation = {
      plantId,
      type,
      note,
      date,
      createdAt: now
    }
    const result = await operationsDB.insert(operation)
    res.status(201).json(result)
  } catch (err) {
    res.status(500).json({ error: '创建操作记录失败' })
  }
})

app.delete('/api/operations/:id', async (req: Request, res: Response) => {
  try {
    const numRemoved = await operationsDB.remove({ _id: req.params.id }, {})
    if (numRemoved === 0) {
      return res.status(404).json({ error: '操作记录不存在' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: '删除操作记录失败' })
  }
})

app.get('/api/plants/:id/photos', (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '8' } = req.query as { page?: string; limit?: string }
    const plantPhotos = photosDB
      .filter(p => p.plantId === req.params.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const start = (pageNum - 1) * limitNum
    const end = start + limitNum
    const paginated = plantPhotos.slice(start, end)
    
    res.json({
      photos: paginated,
      total: plantPhotos.length,
      page: pageNum,
      limit: limitNum,
      hasMore: end < plantPhotos.length
    })
  } catch (err) {
    res.status(500).json({ error: '获取照片列表失败' })
  }
})

app.post('/api/plants/:id/photos', (req: Request, res: Response) => {
  try {
    const { dataUrl, date } = req.body
    if (!dataUrl) {
      return res.status(400).json({ error: '缺少照片数据' })
    }
    const now = new Date().toISOString()
    const photo: Photo = {
      _id: uuidv4(),
      plantId: req.params.id,
      dataUrl,
      date: date || now,
      createdAt: now
    }
    const plantPhotos = photosDB.filter(p => p.plantId === req.params.id)
    if (plantPhotos.length >= 20) {
      return res.status(400).json({ error: '每棵植物最多上传20张照片' })
    }
    photosDB.push(photo)
    res.status(201).json(photo)
  } catch (err) {
    res.status(500).json({ error: '上传照片失败' })
  }
})

app.delete('/api/plants/:plantId/photos/:photoId', (req: Request, res: Response) => {
  try {
    const idx = photosDB.findIndex(p => p._id === req.params.photoId && p.plantId === req.params.plantId)
    if (idx === -1) {
      return res.status(404).json({ error: '照片不存在' })
    }
    photosDB.splice(idx, 1)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: '删除照片失败' })
  }
})

app.get('/api/stats/summary', async (req: Request, res: Response) => {
  try {
    const plants = await plantsDB.find({})
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    
    const operationsThisMonth = await operationsDB.find({
      date: { $gte: monthStart, $lte: monthEnd }
    })
    
    res.json({
      totalPlants: plants.length,
      operationsThisMonth: operationsThisMonth.length
    })
  } catch (err) {
    res.status(500).json({ error: '获取统计数据失败' })
  }
})

app.listen(PORT, () => {
  console.log(`🌱 花园日记后端服务已启动: http://localhost:${PORT}`)
})
