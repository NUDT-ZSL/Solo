type EventHandler = (...args: any[]) => void

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map()

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(...args))
    }
  }
}

export const eventBus = new EventBus()

export interface ArtworkData {
  title: string
  author: string
  year: number
  description: string
  imageCanvas: HTMLCanvasElement
  seriesName: string
}

export interface FrameTextureUpdatePayload {
  frames: ArtworkData[]
}

export interface ArtworkClickPayload {
  index: number
  artwork: ArtworkData
}

export interface NavigateArtworkPayload {
  fromIndex: number
  toIndex: number
}

export interface SeriesChangePayload {
  seriesName: string
}
