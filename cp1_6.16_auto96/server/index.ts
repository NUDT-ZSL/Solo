import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3002

app.use(cors())
app.use(express.json({ limit: '10mb' }))

type Personality = '友好' | '胆小' | '活泼'
type HealthStatus = '已驱虫' | '已疫苗' | '已绝育'
type Gender = '公' | '母'
type ApplicationStatus = 'pending' | 'approved' | 'rejected'
type HousingType = '自有住房' | '租房' | '其他'

interface Animal {
  id: number
  name: string
  breed: string
  age: number
  gender: Gender
  personality: Personality[]
  health: HealthStatus[]
  photo: string
  description: string
  createdAt: string
}

interface Application {
  id: number
  animalId: number
  animalName: string
  applicantName: string
  phone: string
  age: number
  housingType: HousingType[]
  hasPet: boolean
  experience: string
  status: ApplicationStatus
  matchScore: number
  createdAt: string
}

const personalities: Personality[] = ['友好', '胆小', '活泼']
const healthStatuses: HealthStatus[] = ['已驱虫', '已疫苗', '已绝育']
const breeds = ['中华田园猫', '英国短毛猫', '布偶猫', '暹罗猫', '金毛寻回犬', '拉布拉多', '柯基犬', '哈士奇', '萨摩耶', '比熊犬']
const names = ['小白', '花花', '豆豆', '毛毛', '咪咪', '旺财', '来福', '乐乐', '欢欢', '甜甜', '萌萌', '皮皮', '球球', '乖乖', '笨笨', '圆圆', '团团', '妮妮', '贝贝', '多多']

function generateAnimals(count: number): Animal[] {
  const animals: Animal[] = []
  for (let i = 1; i <= count; i++) {
    const personalityCount = Math.floor(Math.random() * 3) + 1
    const shuffledPersonalities = [...personalities].sort(() => Math.random() - 0.5)
    const animalPersonalities = shuffledPersonalities.slice(0, personalityCount) as Personality[]

    const healthCount = Math.floor(Math.random() * 3) + 1
    const shuffledHealth = [...healthStatuses].sort(() => Math.random() - 0.5)
    const animalHealth = shuffledHealth.slice(0, healthCount) as HealthStatus[]

    const breed = breeds[Math.floor(Math.random() * breeds.length)]
    const name = names[Math.floor(Math.random() * names.length)]
    const gender: Gender = Math.random() > 0.5 ? '公' : '母'
    const age = Math.floor(Math.random() * 10) + 1

    const photoSeed = `${i}-${name}`
    const isCat = breed.includes('猫')
    const photoType = isCat ? 'cat' : 'dog'
    const photo = `https://loremflickr.com/400/300/${photoType},pet?lock=${i}`

    animals.push({
      id: i,
      name: `${name}${i}`,
      breed,
      age,
      gender,
      personality: animalPersonalities,
      health: animalHealth,
      photo,
      description: `这是一只${animalPersonalities.join('、')}的${breed}，${gender}，${age}岁。身体健康，${animalHealth.join('、')}。期待找到一个温暖的家。`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }
  return animals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

let animals: Animal[] = generateAnimals(500)
let applications: Application[] = []
let nextAnimalId = 501
let nextApplicationId = 1

const mockApplications: Application[] = [
  {
    id: 1,
    animalId: 1,
    animalName: '小白1',
    applicantName: '张三',
    phone: '13800138001',
    age: 28,
    housingType: ['自有住房'],
    hasPet: false,
    experience: '之前养过一只猫，有3年养宠经验',
    status: 'pending',
    matchScore: 85,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    animalId: 3,
    animalName: '豆豆3',
    applicantName: '李四',
    phone: '13900139002',
    age: 35,
    housingType: ['租房'],
    hasPet: true,
    experience: '家里有一只狗，相处融洽',
    status: 'approved',
    matchScore: 92,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    animalId: 5,
    animalName: '咪咪5',
    applicantName: '王五',
    phone: '13700137003',
    age: 22,
    housingType: ['租房', '其他'],
    hasPet: false,
    experience: '第一次养宠物，但做了很多功课',
    status: 'rejected',
    matchScore: 60,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]
applications = [...mockApplications]
nextApplicationId = 4

app.get('/api/animals', (req, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const start = (page - 1) * limit
  const end = start + limit
  const paginatedAnimals = animals.slice(start, end)

  setTimeout(() => {
    res.json({
      data: paginatedAnimals,
      total: animals.length,
      page,
      limit,
      hasMore: end < animals.length,
    })
  }, 100)
})

app.get('/api/animals/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const animal = animals.find((a) => a.id === id)
  if (!animal) {
    return res.status(404).json({ error: '动物不存在' })
  }
  res.json(animal)
})

app.post('/api/animals', (req, res) => {
  const { name, breed, age, gender, personality, health, photo, description } = req.body

  if (!name || !breed || !age || !gender || !personality || !health || !photo) {
    return res.status(400).json({ error: '缺少必要字段' })
  }

  const newAnimal: Animal = {
    id: nextAnimalId++,
    name,
    breed,
    age,
    gender,
    personality,
    health,
    photo,
    description: description || '',
    createdAt: new Date().toISOString(),
  }

  animals.unshift(newAnimal)
  res.status(201).json(newAnimal)
})

app.get('/api/applications', (req, res) => {
  res.json(applications)
})

app.post('/api/applications', (req, res) => {
  const { animalId, applicantName, phone, age, housingType, hasPet, experience, matchScore } = req.body

  const animal = animals.find((a) => a.id === animalId)
  if (!animal) {
    return res.status(404).json({ error: '动物不存在' })
  }

  const newApplication: Application = {
    id: nextApplicationId++,
    animalId,
    animalName: animal.name,
    applicantName,
    phone,
    age,
    housingType,
    hasPet,
    experience,
    status: 'pending',
    matchScore: matchScore || 0,
    createdAt: new Date().toISOString(),
  }

  applications.unshift(newApplication)
  res.status(201).json(newApplication)
})

app.patch('/api/applications/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const { status } = req.body

  const appIndex = applications.findIndex((a) => a.id === id)
  if (appIndex === -1) {
    return res.status(404).json({ error: '申请不存在' })
  }

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: '无效的状态值' })
  }

  applications[appIndex].status = status
  res.json(applications[appIndex])
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body

  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      token: 'mock-admin-token-' + Date.now(),
      user: { username: 'admin', role: 'admin' },
    })
  } else {
    res.status(401).json({ success: false, error: '用户名或密码错误' })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
