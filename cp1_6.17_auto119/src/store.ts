export interface FixationPoint {
  timestamp: number
  x: number
  y: number
  duration: number
}

export interface Screenshot {
  id: string
  name: string
  imageUrl: string
  imageElement: HTMLImageElement | null
  width: number
  height: number
  fixations: FixationPoint[]
}

export interface HeatmapParams {
  blurRadius: number
  opacity: number
}

export interface SaccadeParams {
  lineColor: string
  lineWidth: number
}

export type EventType =
  | 'screenshot:added'
  | 'screenshot:removed'
  | 'screenshot:switched'
  | 'heatmap:params-changed'
  | 'saccade:params-changed'
  | 'store:updated'

export type EventHandler = (...args: any[]) => void

const COLOR_PALETTE = [
  '#1E3A5F',
  '#2E8B57',
  '#8A2BE2',
  '#E67E22',
  '#4A4A4A'
]

class Store {
  private screenshots: Screenshot[] = []
  private currentScreenshotId: string | null = null
  private heatmapParams: HeatmapParams = {
    blurRadius: 15,
    opacity: 0.6
  }
  private saccadeParams: SaccadeParams = {
    lineColor: COLOR_PALETTE[0],
    lineWidth: 2
  }
  private colorPalette = COLOR_PALETTE
  private eventHandlers: Map<EventType, Set<EventHandler>> = new Map()

  getColorPalette() {
    return [...this.colorPalette]
  }

  getScreenshots() {
    return [...this.screenshots]
  }

  getCurrentScreenshot(): Screenshot | null {
    if (!this.currentScreenshotId) return null
    return this.screenshots.find(s => s.id === this.currentScreenshotId) || null
  }

  getCurrentScreenshotId(): string | null {
    return this.currentScreenshotId
  }

  getHeatmapParams(): HeatmapParams {
    return { ...this.heatmapParams }
  }

  getSaccadeParams(): SaccadeParams {
    return { ...this.saccadeParams }
  }

  addScreenshot(screenshot: Omit<Screenshot, 'id'>): Screenshot | null {
    if (this.screenshots.length >= 10) return null
    const id = this.generateId()
    const newScreenshot: Screenshot = { ...screenshot, id }
    this.screenshots.push(newScreenshot)
    if (!this.currentScreenshotId) {
      this.currentScreenshotId = id
    }
    this.emit('screenshot:added', newScreenshot)
    this.emit('store:updated')
    return newScreenshot
  }

  removeScreenshot(id: string): void {
    const index = this.screenshots.findIndex(s => s.id === id)
    if (index === -1) return
    this.screenshots.splice(index, 1)
    if (this.currentScreenshotId === id) {
      this.currentScreenshotId = this.screenshots.length > 0 ? this.screenshots[0].id : null
    }
    this.emit('screenshot:removed', id)
    this.emit('store:updated')
  }

  switchScreenshot(id: string): void {
    if (!this.screenshots.find(s => s.id === id)) return
    if (this.currentScreenshotId === id) return
    this.currentScreenshotId = id
    this.emit('screenshot:switched', id)
    this.emit('store:updated')
  }

  setHeatmapParams(params: Partial<HeatmapParams>): void {
    this.heatmapParams = { ...this.heatmapParams, ...params }
    this.emit('heatmap:params-changed', this.heatmapParams)
    this.emit('store:updated')
  }

  setSaccadeParams(params: Partial<SaccadeParams>): void {
    this.saccadeParams = { ...this.saccadeParams, ...params }
    this.emit('saccade:params-changed', this.saccadeParams)
    this.emit('store:updated')
  }

  parseCSV(csvText: string): FixationPoint[] {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []

    const headerLine = lines[0]
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase())

    const timestampIdx = headers.indexOf('timestamp')
    const xIdx = headers.indexOf('x')
    const yIdx = headers.indexOf('y')
    const durationIdx = headers.indexOf('fixation_duration_ms')

    if (timestampIdx === -1 || xIdx === -1 || yIdx === -1 || durationIdx === -1) {
      return []
    }

    const fixations: FixationPoint[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < 4) continue
      const timestamp = parseFloat(values[timestampIdx])
      const x = parseFloat(values[xIdx])
      const y = parseFloat(values[yIdx])
      const duration = parseFloat(values[durationIdx])
      if (!isNaN(timestamp) && !isNaN(x) && !isNaN(y) && !isNaN(duration)) {
        fixations.push({ timestamp, x, y, duration })
      }
    }

    fixations.sort((a, b) => a.timestamp - b.timestamp)
    return fixations
  }

  on(event: EventType, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
    return () => this.eventHandlers.get(event)?.delete(handler)
  }

  private emit(event: EventType, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event)
    if (!handlers) return
    handlers.forEach(h => h(...args))
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
  }
}

export const store = new Store()
