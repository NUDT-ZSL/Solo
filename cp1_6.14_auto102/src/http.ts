import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    return config
  },
  (error: AxiosError) => {
    console.error('[Request Error]:', error.message)
    return Promise.reject(error)
  }
)

http.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response
      const message = (data as { error?: string })?.error || '请求失败'

      switch (status) {
        case 400:
          console.error('[400 Bad Request]:', message)
          break
        case 404:
          console.error('[404 Not Found]:', message)
          break
        case 500:
          console.error('[500 Server Error]:', message)
          break
        default:
          console.error(`[${status}]:`, message)
      }
    } else if (error.request) {
      console.error('[Network Error]: 无法连接到服务器')
    } else {
      console.error('[Error]:', error.message)
    }
    return Promise.reject(error)
  }
)

export interface SoundSource {
  id: string
  name: string
  emoji: string
  category: string
  frequency: string
}

export interface SoundTrackItem {
  id: string
  soundId: string
  name: string
  emoji: string
  volume: number
  muted: boolean
  solo: boolean
}

export interface PresetItem {
  id: string
  name: string
  description: string
  tracks: SoundTrackItem[]
  masterVolume: number
  createdAt: string
  updatedAt: string
  shareToken?: string
  trackCount?: number
}

export const soundApi = {
  getSounds: (): Promise<SoundSource[]> => http.get('/sounds'),
}

export const presetsApi = {
  getPresets: (): Promise<PresetItem[]> => http.get('/presets'),
  getPreset: (id: string): Promise<PresetItem> => http.get(`/presets/${id}`),
  createPreset: (data: Partial<PresetItem>): Promise<PresetItem> =>
    http.post('/presets', data),
  updatePreset: (id: string, data: Partial<PresetItem>): Promise<PresetItem> =>
    http.put(`/presets/${id}`, data),
  deletePreset: (id: string): Promise<{ success: boolean }> =>
    http.delete(`/presets/${id}`),
  sharePreset: (id: string): Promise<{ shareUrl: string; shareToken: string }> =>
    http.post(`/presets/${id}/share`),
  getSharedPreset: (token: string): Promise<PresetItem> =>
    http.get(`/presets/share/${token}`),
}

export default http
