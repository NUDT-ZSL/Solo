import type { GameEventType } from './types'

type EventCallback = (data?: any) => void

class EventBus {
  private listeners = new Map<GameEventType, Set<EventCallback>>()

  on(event: GameEventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: GameEventType, callback: EventCallback): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  emit(event: GameEventType, data?: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const bridge = new EventBus()

