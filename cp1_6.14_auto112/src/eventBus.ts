import { EventType, EffectEvent } from './types'

type EventCallback = (...args: unknown[]) => void

class EventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map()

  on(event: EventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: EventType, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback)
  }

  emit(event: EventType, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`EventBus error in listener for ${event}:`, error)
      }
    })
  }

  emitEffect(data: EffectEvent): void {
    this.emit('triggerEffect', data)
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const eventBus = new EventBus()
