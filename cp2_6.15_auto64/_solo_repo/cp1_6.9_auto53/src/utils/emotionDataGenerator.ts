export type EmotionType = 'joy' | 'sadness' | 'anger' | 'surprise'

export interface EmotionData {
  id: string
  type: EmotionType
  polarity: number
  intensity: number
  timestamp: number
}

export const EMOTION_COLORS: Record<EmotionType, string> = {
  joy: '#FFA500',
  sadness: '#00BFFF',
  anger: '#DC143C',
  surprise: '#9B59B6'
}

export const EMOTION_LABELS: Record<EmotionType, string> = {
  joy: '喜悦',
  sadness: '悲伤',
  anger: '愤怒',
  surprise: '惊讶'
}

const EMOTION_TYPES: EmotionType[] = ['joy', 'sadness', 'anger', 'surprise']

const POLARITY_RANGES: Record<EmotionType, [number, number]> = {
  joy: [0.3, 1],
  sadness: [-1, -0.3],
  anger: [-1, -0.5],
  surprise: [-0.2, 0.8]
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateSingleData(): EmotionData {
  const type = EMOTION_TYPES[Math.floor(Math.random() * EMOTION_TYPES.length)]
  const [pMin, pMax] = POLARITY_RANGES[type]
  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    polarity: randomInRange(pMin, pMax),
    intensity: randomInRange(0, 1),
    timestamp: Date.now()
  }
}

export function createInitialData(count: number): EmotionData[] {
  const result: EmotionData[] = []
  for (let i = 0; i < count; i++) {
    const data = generateSingleData()
    data.timestamp = Date.now() - (count - i) * 2000
    result.push(data)
  }
  return result
}

export interface DataGeneratorCallbacks {
  onAdd: (data: EmotionData) => void
  onRemove: (id: string) => void
}

export class EmotionDataGenerator {
  private queue: EmotionData[] = []
  private intervalId: number | null = null
  private maxSize: number
  private callbacks: DataGeneratorCallbacks
  private isPaused: boolean = false

  constructor(maxSize: number, callbacks: DataGeneratorCallbacks) {
    this.maxSize = maxSize
    this.callbacks = callbacks
  }

  init(initialData: EmotionData[]): void {
    this.queue = [...initialData]
  }

  start(): void {
    if (this.intervalId !== null) return
    this.intervalId = window.setInterval(() => {
      if (this.isPaused) return
      this.tick()
    }, 2000)
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  pause(): void {
    this.isPaused = true
  }

  resume(): void {
    this.isPaused = false
  }

  getIsPaused(): boolean {
    return this.isPaused
  }

  getQueue(): EmotionData[] {
    return this.queue
  }

  getSize(): number {
    return this.queue.length
  }

  private tick(): void {
    const newData = generateSingleData()
    this.queue.push(newData)
    this.callbacks.onAdd(newData)

    while (this.queue.length > this.maxSize) {
      const removed = this.queue.shift()!
      this.callbacks.onRemove(removed.id)
    }
  }

  destroy(): void {
    this.stop()
    this.queue = []
  }
}
