export interface WeatherParams {
  temperature: number
  humidity: number
  windSpeed: number
  lightLevel: number
  preset?: PresetName
}

export type PresetName = 'thunder' | 'blizzard' | 'clear' | 'mist' | 'sunset' | 'rainbow'

export interface PresetConfig {
  name: PresetName
  label: string
  icon: string
  params: WeatherParams
}

export const PRESETS: PresetConfig[] = [
  {
    name: 'thunder',
    label: '雷暴',
    icon: '⚡',
    params: { temperature: 18, humidity: 95, windSpeed: 15, lightLevel: 30, preset: 'thunder' },
  },
  {
    name: 'blizzard',
    label: '暴雪',
    icon: '❄️',
    params: { temperature: -8, humidity: 85, windSpeed: 18, lightLevel: 25, preset: 'blizzard' },
  },
  {
    name: 'clear',
    label: '晴空',
    icon: '☀️',
    params: { temperature: 28, humidity: 35, windSpeed: 3, lightLevel: 100, preset: 'clear' },
  },
  {
    name: 'mist',
    label: '薄雾',
    icon: '🌫️',
    params: { temperature: 12, humidity: 75, windSpeed: 2, lightLevel: 45, preset: 'mist' },
  },
  {
    name: 'sunset',
    label: '夕阳',
    icon: '🌅',
    params: { temperature: 22, humidity: 50, windSpeed: 5, lightLevel: 70, preset: 'sunset' },
  },
  {
    name: 'rainbow',
    label: '彩虹',
    icon: '🌈',
    params: { temperature: 20, humidity: 65, windSpeed: 4, lightLevel: 85, preset: 'rainbow' },
  },
]

export interface WeatherArtwork {
  id: string
  params: WeatherParams
  thumbnail: string
  createdAt: number
}

export interface SaveRequest {
  params: WeatherParams
  thumbnail: string
}

export interface SaveResponse {
  id: string
  shareUrl: string
}

export interface GalleryListResponse {
  artworks: WeatherArtwork[]
  total: number
}
