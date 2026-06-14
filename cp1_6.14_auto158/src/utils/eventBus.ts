export type EventCallback = (data?: any) => void

export class EventBus {
  private events: Map<string, EventCallback[]> = new Map()

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)

    return () => {
      this.off(event, callback)
    }
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (!callbacks) return

    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
    }
  }

  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event)
    if (!callbacks) return

    callbacks.forEach((callback) => {
      try {
        callback(data)
      } catch (e) {
        console.error(`Event callback error for "${event}":`, e)
      }
    })
  }

  clear(): void {
    this.events.clear()
  }
}

export const eventBus = new EventBus()
