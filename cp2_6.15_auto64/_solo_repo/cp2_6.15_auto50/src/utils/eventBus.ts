type EventCallback = (...args: any[]) => void

class EventBus {
  private events: Map<string, Set<EventCallback>>

  constructor() {
    this.events = new Map()
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)

    return () => {
      this.off(event, callback)
    }
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.events.delete(event)
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(...args)
      })
    }
  }
}

export const eventBus = new EventBus()

export const EVENT_TYPES = {
  LYRIC_TIMELINE_UPDATED: 'lyricTimelineUpdated',
  LYRIC_SELECTED: 'lyricSelected',
  PLAYBACK_STATE_CHANGED: 'playbackStateChanged',
} as const
