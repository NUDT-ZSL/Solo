import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

interface Echo {
  id: string
  userId: string
  username: string
  latitude: number
  longitude: number
  locationName: string
  contentType: 'audio' | 'text'
  content: string
  duration?: number
  waveformData?: number[]
  createdAt: number
}

interface User {
  id: string
  username: string
  currentLat: number
  currentLng: number
}

interface EchoNotification {
  id: string
  echoId: string
  title: string
  distance: number
  timestamp: number
  echo: Echo
}

function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const locationNames = [
  '外滩观景台', '南京路步行街', '陆家嘴金融中心', '人民广场',
  '豫园老街', '田子坊艺术区', '新天地', '静安寺',
  '徐家汇天主教堂', '武康路历史街', '1933老场坊', '多伦路文化街',
  '朱家角古镇', '迪士尼小镇', '东方明珠脚下', '滨江大道',
  '思南公馆', 'M50创意园', '甜爱路', '愚园路弄堂'
]

function reverseGeocode(lat: number, lng: number): string {
  const seed = Math.floor(Math.abs(lat * 1000 + lng * 1000)) % locationNames.length
  const baseName = locationNames[seed]
  const offset = Math.floor(Math.abs((lat + lng) * 100) % 500)
  return `${baseName} 附近${offset}米`
}

function getEchoSummary(echo: Echo): string {
  if (echo.contentType === 'audio') {
    return `${echo.username} 的语音回声`
  }
  const text = echo.content
  return text.length > 20 ? text.slice(0, 20) + '…' : text
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))

const PORT = 3001

const usersMap = new Map<string, User>()
const echoesMap = new Map<string, Echo>()
const userEchoesIndex = new Map<string, string[]>()

const DEFAULT_LAT = 31.2304
const DEFAULT_LNG = 121.4737

function seedMockEchoes(): void {
  const mockUsers = [
    { id: 'mock-user-1', username: '旅行诗人' },
    { id: 'mock-user-2', username: '城市漫步者' },
    { id: 'mock-user-3', username: '时光收藏者' }
  ]
  mockUsers.forEach(u => {
    usersMap.set(u.id, { ...u, currentLat: DEFAULT_LAT, currentLng: DEFAULT_LNG })
  })
  const sampleTexts = [
    '这里的日落真的太美了！下次一定要带她来看～',
    '还记得我们第一次相遇的咖啡店吗？就是这个街角。',
    '三年前的今天，我在这里拿到了录取通知书。青春啊。',
    '留给下一个路过的人：愿你今天有好心情！✨',
    '这家的生煎包绝了！皮薄馅大汤多，强烈推荐！',
    '在这里坐了一下午，看着人来人往，内心很平静。',
    '时间胶囊：2025年的春天，我做出了一个重要决定。',
    '给未来的自己：别忘了此刻的热情和勇气。',
    '城市的霓虹灯下，每个人都有自己的故事。',
    '雨后的石板路，有青草和泥土的香气。'
  ]
  for (let i = 0; i < 10; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.008
    const offsetLng = (Math.random() - 0.5) * 0.008
    const lat = DEFAULT_LAT + offsetLat
    const lng = DEFAULT_LNG + offsetLng
    const isAudio = i % 3 === 0
    const user = mockUsers[i % 3]
    const echo: Echo = {
      id: uuidv4(),
      userId: user.id,
      username: user.username,
      latitude: lat,
      longitude: lng,
      locationName: reverseGeocode(lat, lng),
      contentType: isAudio ? 'audio' : 'text',
      content: isAudio ? 'data:audio/webm;base64,' : sampleTexts[i % sampleTexts.length],
      duration: isAudio ? 8 + Math.floor(Math.random() * 25) : undefined,
      waveformData: isAudio
        ? Array.from({ length: 32 }, () => 0.2 + Math.random() * 0.8)
        : undefined,
      createdAt: Date.now() - Math.floor(Math.random() * 86400000 * 5)
    }
    echoesMap.set(echo.id, echo)
    const arr = userEchoesIndex.get(user.id) || []
    arr.push(echo.id)
    userEchoesIndex.set(user.id, arr)
  }
}

seedMockEchoes()

app.post('/api/register', (req: Request, res: Response) => {
  try {
    const { username } = req.body
    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: '用户名不能为空' })
    }
    const trimmed = username.trim().slice(0, 16)
    const user: User = {
      id: uuidv4(),
      username: trimmed,
      currentLat: DEFAULT_LAT,
      currentLng: DEFAULT_LNG
    }
    usersMap.set(user.id, user)
    console.log(`[注册] 新用户: ${user.username} (${user.id})`)
    res.json({ user, token: `demo-token-${user.id}` })
  } catch (err) {
    res.status(500).json({ error: '注册失败' })
  }
})

app.get('/api/echoes', (req: Request, res: Response) => {
  try {
    const latQuery = req.query.lat
    const lngQuery = req.query.lng
    const radiusQuery = req.query.radius
    const all = Array.from(echoesMap.values())
    if (latQuery !== undefined && lngQuery !== undefined) {
      const lat = Number(latQuery)
      const lng = Number(lngQuery)
      const radius = Number(radiusQuery) || 5000
      const filtered = all.filter(e =>
        calculateDistance(lat, lng, e.latitude, e.longitude) <= radius
      )
      return res.json(filtered.sort((a, b) => b.createdAt - a.createdAt))
    }
    res.json(all.sort((a, b) => b.createdAt - a.createdAt))
  } catch (err) {
    res.status(500).json({ error: '获取回声失败' })
  }
})

app.get('/api/echoes/:id', (req: Request, res: Response) => {
  try {
    const echo = echoesMap.get(req.params.id)
    if (!echo) return res.status(404).json({ error: '回声不存在' })
    res.json(echo)
  } catch (err) {
    res.status(500).json({ error: '获取失败' })
  }
})

app.post('/api/echoes', (req: Request, res: Response) => {
  try {
    const body = req.body
    if (!body.userId || !body.content) {
      return res.status(400).json({ error: '参数不完整' })
    }
    const echo: Echo = {
      id: uuidv4(),
      userId: body.userId,
      username: body.username || '匿名用户',
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      locationName: body.locationName || reverseGeocode(Number(body.latitude), Number(body.longitude)),
      contentType: body.contentType === 'audio' ? 'audio' : 'text',
      content: body.content,
      duration: body.duration ? Number(body.duration) : undefined,
      waveformData: Array.isArray(body.waveformData) ? body.waveformData : undefined,
      createdAt: Date.now()
    }
    echoesMap.set(echo.id, echo)
    const arr = userEchoesIndex.get(echo.userId) || []
    arr.push(echo.id)
    userEchoesIndex.set(echo.userId, arr)
    console.log(`[创建回声] ${echo.username} @ (${echo.latitude.toFixed(4)}, ${echo.longitude.toFixed(4)}) [${echo.contentType}]`)
    res.json(echo)
  } catch (err) {
    res.status(500).json({ error: '创建回声失败' })
  }
})

app.put('/api/echoes/:id', (req: Request, res: Response) => {
  try {
    const existing = echoesMap.get(req.params.id)
    if (!existing) return res.status(404).json({ error: '回声不存在' })
    const body = req.body
    const updated: Echo = {
      ...existing,
      contentType: body.contentType ?? existing.contentType,
      content: body.content ?? existing.content,
      duration: body.duration !== undefined ? Number(body.duration) : existing.duration,
      waveformData: Array.isArray(body.waveformData) ? body.waveformData : existing.waveformData
    }
    echoesMap.set(existing.id, updated)
    console.log(`[更新回声] ${existing.id}`)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: '更新失败' })
  }
})

app.delete('/api/echoes/:id', (req: Request, res: Response) => {
  try {
    const existing = echoesMap.get(req.params.id)
    if (!existing) return res.status(404).json({ error: '回声不存在' })
    echoesMap.delete(existing.id)
    const arr = userEchoesIndex.get(existing.userId) || []
    const filtered = arr.filter(id => id !== existing.id)
    userEchoesIndex.set(existing.userId, filtered)
    console.log(`[删除回声] ${existing.id}`)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: '删除失败' })
  }
})

app.get('/api/users/:userId/echoes', (req: Request, res: Response) => {
  try {
    const echoIds = userEchoesIndex.get(req.params.userId) || []
    const echoes = echoIds
      .map(id => echoesMap.get(id))
      .filter((e): e is Echo => e !== undefined)
      .sort((a, b) => b.createdAt - a.createdAt)
    res.json(echoes)
  } catch (err) {
    res.status(500).json({ error: '获取失败' })
  }
})

app.get('/api/scan', (req: Request, res: Response) => {
  try {
    const userId = String(req.query.userId || '')
    const lat = Number(req.query.lat)
    const lng = Number(req.query.lng)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: '坐标参数错误' })
    }
    const RADIUS = 100
    const allEchoes = Array.from(echoesMap.values())
    const nearby: EchoNotification[] = []
    for (const echo of allEchoes) {
      if (echo.userId === userId) continue
      const distance = calculateDistance(lat, lng, echo.latitude, echo.longitude)
      if (distance <= RADIUS) {
        nearby.push({
          id: `notif-${echo.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          echoId: echo.id,
          title: getEchoSummary(echo),
          distance,
          timestamp: Date.now(),
          echo
        })
      }
    }
    nearby.sort((a, b) => a.distance - b.distance)
    if (nearby.length > 0) {
      console.log(`[扫描] 用户 ${userId} 附近发现 ${nearby.length} 条回声 (最近 ${Math.round(nearby[0].distance)}m)`)
    }
    res.json(nearby)
  } catch (err) {
    res.status(500).json({ error: '扫描失败' })
  }
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    users: usersMap.size,
    echoes: echoesMap.size,
    timestamp: Date.now()
  })
})

app.listen(PORT, () => {
  console.log('')
  console.log('  🌊 回声备忘录后端服务启动')
  console.log(`  📡 监听端口:     ${PORT}`)
  console.log(`  📦 预置用户数:   ${usersMap.size}`)
  console.log(`  📍 预置回声数:   ${echoesMap.size}`)
  console.log(`  🔗 健康检查:     http://localhost:${PORT}/api/health`)
  console.log('')
})

export default app
