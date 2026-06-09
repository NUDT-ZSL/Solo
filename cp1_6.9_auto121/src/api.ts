export interface PaletteColor {
  hex: string
  emotion: string
}

export interface Feedback {
  id: string
  color: string
  createdAt: number
}

export interface Palette {
  id: string
  name: string
  tags: string[]
  colors: PaletteColor[]
  emotion: string
  createdAt: number
  feedbacks: Feedback[]
}

export interface CreatePaletteRequest {
  name: string
  tags: string[]
  colors: PaletteColor[]
  emotion: string
}

const BASE_URL = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export function createPalette(data: CreatePaletteRequest): Promise<{ id: string; palette: Palette }> {
  return request(`${BASE_URL}/palettes`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getPalettes(): Promise<Palette[]> {
  return request(`${BASE_URL}/palettes`)
}

export function getPalette(id: string): Promise<Palette> {
  return request(`${BASE_URL}/palettes/${id}`)
}

export function submitFeedback(id: string, color: string): Promise<Feedback> {
  return request(`${BASE_URL}/palettes/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ color }),
  })
}

export const EMOTION_OPTIONS = [
  { value: '愉悦', label: '愉悦' },
  { value: '忧郁', label: '忧郁' },
  { value: '平静', label: '平静' },
  { value: '烦闷', label: '烦闷' },
  { value: '惊喜', label: '惊喜' },
  { value: '悲伤', label: '悲伤' },
] as const

export type EmotionType = typeof EMOTION_OPTIONS[number]['value']

export const EMOTION_COLORS: Record<EmotionType, string> = {
  '愉悦': '#E74C3C',
  '忧郁': '#3498DB',
  '平静': '#27AE60',
  '烦闷': '#E67E22',
  '惊喜': '#9B59B6',
  '悲伤': '#95A5A6',
}

export const COLOR_EMOTION_MAP: Array<{ range: [number, number, number, number, number, number]; words: string[] }> = [
  { range: [200, 0, 0, 255, 100, 80], words: ['激情', '愤怒', '热烈', '勇气'] },
  { range: [180, 60, 60, 255, 150, 150], words: ['浪漫', '温柔', '爱情', '甜美'] },
  { range: [220, 120, 0, 255, 180, 60], words: ['躁动', '活力', '创意', '温暖'] },
  { range: [240, 180, 50, 255, 230, 140], words: ['快乐', '阳光', '希望', '警惕'] },
  { range: [80, 160, 60, 160, 220, 140], words: ['安宁', '自然', '和谐', '嫉妒'] },
  { range: [40, 140, 120, 120, 200, 180], words: ['清新', '宁静', '年轻', '新生'] },
  { range: [30, 80, 180, 100, 160, 240], words: ['忧郁', '平静', '信任', '深邃'] },
  { range: [130, 80, 180, 200, 140, 230], words: ['神秘', '高贵', '梦幻', '浪漫'] },
  { range: [200, 100, 180, 240, 160, 220], words: ['优雅', '魅力', '甜美', '怀旧'] },
  { range: [150, 100, 60, 200, 170, 130], words: ['稳重', '踏实', '质朴', '温暖'] },
  { range: [180, 180, 180, 230, 230, 230], words: ['纯净', '简洁', '高雅', '宁静'] },
  { range: [50, 50, 50, 120, 120, 120], words: ['深沉', '稳重', '神秘', '权威'] },
]

export function getEmotionWords(r: number, g: number, b: number): string {
  for (const { range, words } of COLOR_EMOTION_MAP) {
    const [rMin, gMin, bMin, rMax, gMax, bMax] = range
    if (r >= rMin && r <= rMax && g >= gMin && g <= gMax && b >= bMin && b <= bMax) {
      return words[Math.floor(Math.random() * words.length)]
    }
  }

  if (r > 200 && g > 200 && b > 200) return '纯净'
  if (r < 60 && g < 60 && b < 60) return '深沉'
  if (r > g && r > b) return r > 180 ? '热情' : '温暖'
  if (g > r && g > b) return g > 180 ? '生机' : '平和'
  if (b > r && b > g) return b > 180 ? '清澈' : '沉静'
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return '和谐'

  return '独特'
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [128, 128, 128]
}

export const PRESET_COLORS = [
  '#E74C3C', '#E67E22', '#F39C12', '#F1C40F',
  '#2ECC71', '#27AE60', '#1ABC9C', '#16A085',
  '#3498DB', '#2980B9', '#9B59B6', '#8E44AD',
]
