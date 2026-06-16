import { EventType, EventHandler } from '@/types'

class EventBus {
  private events: Map<EventType, Set<EventHandler>> = new Map()

  on<T>(event: EventType, handler: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(handler as EventHandler)
  }

  off<T>(event: EventType, handler: EventHandler<T>): void {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.delete(handler as EventHandler)
    }
  }

  emit<T>(event: EventType, data: T): void {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }

  clear(): void {
    this.events.clear()
  }
}

export const eventBus = new EventBus()
