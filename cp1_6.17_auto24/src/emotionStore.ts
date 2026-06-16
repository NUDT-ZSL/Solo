export type EmotionType = 'amaze' | 'joy' | 'thought' | 'moved' | 'doubt'

export interface EmotionCount {
  amaze: number
  joy: number
  thought: number
  moved: number
  doubt: number
}

export type EmotionMap = Map<string, EmotionCount>

const STORAGE_KEY = 'virtual_gallery_emotions'

const createEmptyEmotion = (): EmotionCount => ({
  amaze: 0,
  joy: 0,
  thought: 0,
  moved: 0,
  doubt: 0,
})

export const serializeEmotionMap = (map: EmotionMap): string => {
  const obj: Record<string, EmotionCount> = {}
  map.forEach((value, key) => {
    obj[key] = value
  })
  return JSON.stringify(obj)
}

export const deserializeEmotionMap = (json: string): EmotionMap => {
  const map: EmotionMap = new Map()
  try {
    const obj: Record<string, EmotionCount> = JSON.parse(json)
    Object.keys(obj).forEach((key) => {
      map.set(key, { ...createEmptyEmotion(), ...obj[key] })
    })
  } catch {
    // ignore parse error
  }
  return map
}

class EmotionStore {
  private data: EmotionMap = new Map()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.data = deserializeEmotionMap(stored)
      }
    } catch {
      // ignore storage error
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, serializeEmotionMap(this.data))
    } catch {
      // ignore storage error
    }
  }

  addEmotion(artId: string, emotion: EmotionType): EmotionCount {
    const current = this.data.get(artId) || createEmptyEmotion()
    const updated: EmotionCount = {
      ...current,
      [emotion]: current[emotion] + 1,
    }
    this.data.set(artId, updated)
    this.saveToStorage()
    return updated
  }

  getEmotion(artId: string): EmotionCount {
    return this.data.get(artId) || createEmptyEmotion()
  }

  getAll(): EmotionMap {
    return new Map(this.data)
  }

  clearAll(): void {
    this.data.clear()
    this.saveToStorage()
  }
}

export const emotionStore = new EmotionStore()

export const EMOTION_TYPES: EmotionType[] = [
  'amaze',
  'joy',
  'thought',
  'moved',
  'doubt',
]

export const EMOTION_COLORS: Record<EmotionType, string> = {
  amaze: '#FF6B6B',
  joy: '#4FC3F7',
  thought: '#FFD54F',
  moved: '#81C784',
  doubt: '#CE93D8',
}

export const EMOTION_LABELS: Record<EmotionType, string> = {
  amaze: '惊叹',
  joy: '愉悦',
  thought: '深思',
  moved: '感动',
  doubt: '疑惑',
}
