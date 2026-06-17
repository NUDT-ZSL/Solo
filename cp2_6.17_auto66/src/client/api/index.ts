export interface Artwork {
  id: string
  title: string
  artist: string
  category: 'painting' | 'sculpture' | 'photography' | 'digital'
  price: number
  description: string
  coverImage: string
  status: 'onsale' | 'sold'
  createdAt: string
  views: number
  likes: number
  favorites: number
}

export interface ViewRecord {
  id: string
  artworkId: string
  visitorId: string
  timestamp: string
  source: string
}

export interface CategoryStat {
  category: string
  categoryKey: string
  views: number
}

export interface HourlyStat {
  hour: string
  views: number
}

export interface AnalyticsData {
  categoryStats: CategoryStat[]
  hourlyStats: HourlyStat[]
}

function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let canvasHash = ''
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('ArtMarketFP', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('ArtMarketFP', 4, 17)
    canvasHash = canvas.toDataURL().slice(-32)
  }
  const parts = [
    navigator.userAgent,
    String(screen.width) + 'x' + String(screen.height),
    String(screen.colorDepth),
    new Date().getTimezoneOffset().toString(),
    navigator.language,
    canvasHash
  ]
  const raw = parts.join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return 'device-' + Math.abs(hash).toString(36)
}

let visitorId = localStorage.getItem('visitor_id')
if (!visitorId) {
  visitorId = generateDeviceFingerprint()
  localStorage.setItem('visitor_id', visitorId)
}

export const getVisitorId = () => visitorId!

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers
    }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  getArtworks: () => request<Artwork[]>('/api/artworks'),
  getArtworkById: (id: string) => request<Artwork>(`/api/artworks/${id}`),
  addArtwork: (formData: FormData) =>
    request<Artwork>('/api/artworks', { method: 'POST', body: formData }),
  toggleLike: (id: string) =>
    request<{ liked: boolean; likes: number }>(`/api/artworks/${id}/like`, {
      method: 'POST',
      body: JSON.stringify({ visitorId: getVisitorId() })
    }),
  toggleFavorite: (id: string) =>
    request<{ favorited: boolean; favorites: number }>(`/api/artworks/${id}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ visitorId: getVisitorId() })
    }),
  recordView: (id: string, source = '详情页') =>
    request<ViewRecord>(`/api/artworks/${id}/view`, {
      method: 'POST',
      body: JSON.stringify({ visitorId: getVisitorId(), source })
    }),
  getViews: (id: string) => request<ViewRecord[]>(`/api/artworks/${id}/views`),
  getAnalytics: () => request<AnalyticsData>('/api/analytics'),
  getArtists: () => request<string[]>('/api/artists'),
  getArtistWorks: (name: string) =>
    request<Artwork[]>(`/api/artists/${encodeURIComponent(name)}/works`),
  getUserState: () =>
    request<{ likedArtworks: string[]; favoritedArtworks: string[] }>(
      `/api/user/${getVisitorId()}/state`
    )
}

export const categoryLabels: Record<string, string> = {
  painting: '绘画',
  sculpture: '雕塑',
  photography: '摄影',
  digital: '数字艺术'
}
