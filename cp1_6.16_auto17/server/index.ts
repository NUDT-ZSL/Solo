import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { Photo, Package, Booking, TimeSlot } from '../src/business/portfolio'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const styles: Photo['style'][] = ['portrait', 'landscape', 'commercial', 'wedding']
const titles = [
  '城市黄昏', '山间晨雾', '婚礼时刻', '商业人像', '海边日落',
  '家庭温馨', '古镇风情', '星空银河', '时尚街拍', '儿童写真',
  '自然风光', '建筑美学', '花卉微距', '运动瞬间', '美食摄影',
  '旅行日记', '艺术人像', '城市夜景', '田园风光', '海洋生物',
  '人物肖像', '产品展示', '婚礼纪实', '宝宝成长', '毕业纪念',
  '情侣写真', '闺蜜合影', '老人寿宴', '活动跟拍', '会议记录',
  '舞台表演', '展览开幕', '私人派对', '企业年会', '讲座论坛',
  '户外活动', '亲子时光', '宠物萌照', '城市街景', '人文纪实',
  '山水画卷', '沙漠驼铃', '草原牧歌', '雪山攀登', '热带雨林',
  '瀑布奇观', '湖泊倒影', '海滩漫步', '夕阳剪影', '星空轨迹'
]

const generatePhotos = (): Photo[] => {
  const photos: Photo[] = []
  for (let i = 0; i < 50; i++) {
    const year = 2024 + Math.floor(Math.random() * 2)
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
    const heights = [200, 250, 300, 350, 400, 280, 320, 220]
    photos.push({
      id: uuidv4(),
      title: titles[i % titles.length],
      style: styles[Math.floor(Math.random() * styles.length)],
      price: Math.floor(Math.random() * 4000) + 1000,
      shootDate: `${year}-${month}-${day}`,
      height: heights[Math.floor(Math.random() * heights.length)]
    })
  }
  return photos
}

const photos: Photo[] = generatePhotos()

const packages: Package[] = [
  {
    id: 'pkg-basic',
    name: 'basic',
    price: 2999,
    editedPhotos: 30,
    duration: 2,
    outfits: 2,
    color: '#B8D4C3'
  },
  {
    id: 'pkg-standard',
    name: 'standard',
    price: 5999,
    editedPhotos: 60,
    duration: 4,
    outfits: 4,
    color: '#D4A574'
  },
  {
    id: 'pkg-premium',
    name: 'premium',
    price: 9999,
    editedPhotos: 100,
    duration: 8,
    outfits: 6,
    color: '#A88B6A'
  }
]

const today = new Date()
const generateBookings = (): Booking[] => {
  const bookings: Booking[] = []
  const statuses: Booking['status'][] = ['pending', 'confirmed', 'completed']
  const timeSlots: TimeSlot[] = ['morning', 'afternoon']
  for (let i = 0; i < 15; i++) {
    const bookingDate = new Date(today)
    bookingDate.setDate(today.getDate() + Math.floor(Math.random() * 30) - 10)
    const createdAt = new Date(today)
    createdAt.setDate(today.getDate() - Math.floor(Math.random() * 20))
    bookings.push({
      id: uuidv4(),
      date: bookingDate.toISOString().split('T')[0],
      timeSlot: timeSlots[Math.floor(Math.random() * timeSlots.length)],
      name: `客户${i + 1}`,
      phone: `1${3 + Math.floor(Math.random() * 7)}${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`,
      email: `client${i + 1}@example.com`,
      packageId: packages[Math.floor(Math.random() * packages.length)].id,
      notes: i % 3 === 0 ? '希望能拍摄外景' : undefined,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: createdAt.toISOString()
    })
  }
  return bookings
}

const bookings: Booking[] = generateBookings()

app.get('/api/photos', (_req: Request, res: Response) => {
  res.json(photos)
})

app.get('/api/packages', (_req: Request, res: Response) => {
  res.json(packages)
})

app.get('/api/bookings', (_req: Request, res: Response) => {
  res.json(bookings)
})

app.post('/api/bookings', (req: Request, res: Response) => {
  const { name, phone, email, date, timeSlot, packageId, notes } = req.body
  
  if (!name || !phone || !email || !date || !packageId || !timeSlot) {
    return res.status(400).json({ error: '缺少必填字段' })
  }
  
  const newBooking: Booking = {
    id: uuidv4(),
    date,
    timeSlot,
    name,
    phone,
    email,
    packageId,
    notes,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  
  bookings.push(newBooking)
  res.status(201).json(newBooking)
})

app.get('/api/photographer', (_req: Request, res: Response) => {
  res.json({
    name: '张明',
    title: '首席摄影师',
    experience: '10年',
    specialty: '人像、婚礼、商业摄影',
    bio: '毕业于中央美术学院摄影系，专注于捕捉生活中的美好瞬间，作品曾多次获得国内外摄影大奖。'
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
