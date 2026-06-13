import express from 'express'
import cors from 'cors'
import Datastore from 'nedb-promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dataDir = join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const petsDb = Datastore.create({ filename: join(dataDir, 'pets.db'), autoload: true })
const tasksDb = Datastore.create({ filename: join(dataDir, 'tasks.db'), autoload: true })
const notificationsDb = Datastore.create({ filename: join(dataDir, 'notifications.db'), autoload: true })

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/api/pets', async (req, res) => {
  try {
    const pets = await petsDb.find({}).sort({ createdAt: -1 })
    res.json(pets)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/pets', async (req, res) => {
  try {
    const pet = {
      ...req.body,
      createdAt: new Date().toISOString(),
    }
    const newPet = await petsDb.insert(pet)
    res.json(newPet)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/pets/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updatedPet = await petsDb.update(
      { _id: id },
      { $set: req.body },
      { returnUpdatedDocs: true }
    )
    res.json(updatedPet)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/pets/:id', async (req, res) => {
  try {
    const { id } = req.params
    await petsDb.remove({ _id: id }, {})
    await tasksDb.remove({ petId: id }, { multi: true })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/tasks', async (req, res) => {
  try {
    const { petId } = req.query
    const query = petId ? { petId } : {}
    const tasks = await tasksDb.find(query).sort({ date: 1, time: 1 })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/tasks', async (req, res) => {
  try {
    const task = {
      ...req.body,
      createdAt: new Date().toISOString(),
      completed: false,
    }
    const newTask = await tasksDb.insert(task)
    res.json(newTask)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updatedTask = await tasksDb.update(
      { _id: id },
      { $set: req.body },
      { returnUpdatedDocs: true }
    )
    res.json(updatedTask)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    await tasksDb.remove({ _id: id }, {})
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/notifications', async (req, res) => {
  try {
    let settings = await notificationsDb.findOne({ type: 'settings' })
    if (!settings) {
      settings = await notificationsDb.insert({
        type: 'settings',
        defaultReminderTime: '08:00',
        weeklyReportEnabled: true,
      })
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/notifications/settings', async (req, res) => {
  try {
    let settings = await notificationsDb.findOne({ type: 'settings' })
    if (settings) {
      settings = await notificationsDb.update(
        { _id: settings._id },
        { $set: { ...req.body, type: 'settings' } },
        { returnUpdatedDocs: true }
      )
    } else {
      settings = await notificationsDb.insert({
        type: 'settings',
        ...req.body,
      })
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/seed', async (req, res) => {
  try {
    const existingPets = await petsDb.find({})
    if (existingPets.length > 0) {
      return res.json({ message: '数据已存在' })
    }

    const petColors = ['#f97316', '#22c55e', '#a855f7', '#3b82f6', '#f43f5e']
    
    const pet1 = await petsDb.insert({
      name: '豆豆',
      breed: '金毛寻回犬',
      birthDate: '2021-03-15',
      weight: '28.5',
      avatar: '',
      borderColor: petColors[0],
      createdAt: new Date().toISOString(),
    })

    const pet2 = await petsDb.insert({
      name: '咪咪',
      breed: '英短蓝猫',
      birthDate: '2022-07-20',
      weight: '5.2',
      avatar: '',
      borderColor: petColors[2],
      createdAt: new Date().toISOString(),
    })

    const today = new Date()
    const formatDate = (d) => {
      return d.toISOString().split('T')[0]
    }

    const sampleTasks = [
      { petId: pet1._id, title: '早餐喂食', category: 'feeding', date: formatDate(today), time: '07:30', notes: '狗粮150g，温水泡软', completed: false },
      { petId: pet1._id, title: '晨间遛狗', category: 'walking', date: formatDate(today), time: '08:00', notes: '小区公园散步30分钟', completed: false },
      { petId: pet1._id, title: '驱虫药', category: 'medication', date: formatDate(today), time: '09:00', notes: '半片，混在食物中', completed: false },
      { petId: pet1._id, title: '午餐喂食', category: 'feeding', date: formatDate(today), time: '12:30', notes: '狗粮150g', completed: false },
      { petId: pet1._id, title: '下午遛狗', category: 'walking', date: formatDate(today), time: '17:00', notes: '户外活动45分钟', completed: false },
      { petId: pet1._id, title: '晚餐喂食', category: 'feeding', date: formatDate(today), time: '19:00', notes: '狗粮150g + 鸡肉少量', completed: false },
      { petId: pet1._id, title: '兽医复查', category: 'vet', date: formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)), time: '10:00', notes: '皮肤复查，带上次的药', completed: false },
      
      { petId: pet2._id, title: '早餐喂食', category: 'feeding', date: formatDate(today), time: '08:00', notes: '猫粮50g', completed: false },
      { petId: pet2._id, title: '化毛膏', category: 'medication', date: formatDate(today), time: '10:00', notes: '每日一次，2cm长度', completed: false },
      { petId: pet2._id, title: '晚餐喂食', category: 'feeding', date: formatDate(today), time: '18:00', notes: '猫粮50g + 罐头', completed: false },
      { petId: pet2._id, title: '遛弯', category: 'walking', date: formatDate(new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)), time: '16:00', notes: '阳台晒太阳', completed: false },
    ]

    for (const task of sampleTasks) {
      await tasksDb.insert(task)
    }

    await notificationsDb.insert({
      type: 'settings',
      defaultReminderTime: '08:00',
      weeklyReportEnabled: true,
    })

    res.json({ message: '示例数据已生成', pets: [pet1, pet2] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
