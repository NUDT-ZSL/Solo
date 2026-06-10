export interface Echo {
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

export interface User {
  id: string
  username: string
  currentLat: number
  currentLng: number
}

export interface EchoNotification {
  id: string
  echoId: string
  title: string
  distance: number
  timestamp: number
  echo: Echo
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
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

export function reverseGeocode(lat: number, lng: number): string {
  const seed = Math.floor(Math.abs(lat * 1000 + lng * 1000)) % locationNames.length
  const baseName = locationNames[seed]
  const offset = Math.floor(Math.abs((lat + lng) * 100) % 500)
  return `${baseName} 附近${offset}米`
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const mins = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hours}:${mins}`
}

export function getEchoSummary(echo: Echo): string {
  if (echo.contentType === 'audio') {
    const secs = echo.duration || 0
    return `🎙️ ${secs}秒语音回声`
  }
  return echo.content.length > 20 ? echo.content.slice(0, 20) + '…' : echo.content
}

export function getInitials(username: string): string {
  if (!username) return 'U'
  const trimmed = username.trim()
  return trimmed.charAt(0).toUpperCase()
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const BASE_URL = '/api'

export async function registerUser(username: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  })
  if (!res.ok) throw new Error('注册失败')
  return res.json()
}

export async function createEcho(data: Omit<Echo, 'id' | 'createdAt'>): Promise<Echo> {
  const res = await fetch(`${BASE_URL}/echoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('创建回声失败')
  return res.json()
}

export async function getEchoes(lat?: number, lng?: number, radius?: number): Promise<Echo[]> {
  const params = new URLSearchParams()
  if (lat !== undefined) params.set('lat', String(lat))
  if (lng !== undefined) params.set('lng', String(lng))
  if (radius !== undefined) params.set('radius', String(radius))
  const res = await fetch(`${BASE_URL}/echoes?${params.toString()}`)
  if (!res.ok) throw new Error('获取回声失败')
  return res.json()
}

export async function getUserEchoes(userId: string): Promise<Echo[]> {
  const res = await fetch(`${BASE_URL}/users/${userId}/echoes`)
  if (!res.ok) throw new Error('获取用户回声失败')
  return res.json()
}

export async function updateEcho(id: string, data: Partial<Echo>): Promise<Echo> {
  const res = await fetch(`${BASE_URL}/echoes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('更新回声失败')
  return res.json()
}

export async function deleteEcho(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/echoes/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除回声失败')
  return res.json()
}

export async function scanNearby(
  userId: string,
  lat: number,
  lng: number
): Promise<EchoNotification[]> {
  const params = new URLSearchParams({
    userId,
    lat: String(lat),
    lng: String(lng)
  })
  const res = await fetch(`${BASE_URL}/scan?${params.toString()}`)
  if (!res.ok) throw new Error('扫描失败')
  return res.json()
}

export function generateMockEchoes(
  centerLat: number,
  centerLng: number,
  count: number = 8
): Echo[] {
  const echoes: Echo[] = []
  const sampleTexts = [
    '这里的日落真的太美了！下次一定要带她来看～',
    '还记得我们第一次相遇的咖啡店吗？就是这个街角。',
    '三年前的今天，我在这里拿到了录取通知书。青春啊。',
    '留给下一个路过的人：愿你今天有好心情！✨',
    '这家的生煎包绝了！皮薄馅大汤多，强烈推荐！',
    '在这里坐了一下午，看着人来人往，内心很平静。',
    '时间胶囊：2025年的春天，我做出了一个重要决定。',
    '给未来的自己：别忘了此刻的热情和勇气。'
  ]
  for (let i = 0; i < count; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.008
    const offsetLng = (Math.random() - 0.5) * 0.008
    const isAudio = i % 3 === 0
    echoes.push({
      id: `mock-${i}-${Date.now()}`,
      userId: `mock-user-${(i % 3) + 1}`,
      username: ['旅行诗人', '城市漫步者', '时光收藏者'][i % 3],
      latitude: centerLat + offsetLat,
      longitude: centerLng + offsetLng,
      locationName: reverseGeocode(centerLat + offsetLat, centerLng + offsetLng),
      contentType: isAudio ? 'audio' : 'text',
      content: isAudio ? 'data:audio/webm;base64,' : sampleTexts[i % sampleTexts.length],
      duration: isAudio ? 8 + Math.floor(Math.random() * 25) : undefined,
      waveformData: isAudio
        ? Array.from({ length: 32 }, () => 0.2 + Math.random() * 0.8)
        : undefined,
      createdAt: Date.now() - Math.floor(Math.random() * 86400000 * 5)
    })
  }
  return echoes
}
