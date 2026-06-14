import type { EventBusInterface, EventBusCallback, EventBusEventMap } from '@/types'

class EventBus implements EventBusInterface {
  private events: Map<keyof EventBusEventMap, Set<EventBusCallback>> = new Map()

  on<K extends keyof EventBusEventMap>(
    event: K,
    callback: EventBusCallback<EventBusEventMap[K]>
  ): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback as EventBusCallback)
  }

  off<K extends keyof EventBusEventMap>(
    event: K,
    callback: EventBusCallback<EventBusEventMap[K]>
  ): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback as EventBusCallback)
    }
  }

  emit<K extends keyof EventBusEventMap>(
    event: K,
    data: EventBusEventMap[K]
  ): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[EventBus] Error in event handler for "${event}":`, error)
        }
      })
    }
  }

  once<K extends keyof EventBusEventMap>(
    event: K,
    callback: EventBusCallback<EventBusEventMap[K]>
  ): void {
    const onceCallback = (data: EventBusEventMap[K]) => {
      callback(data)
      this.off(event, onceCallback as EventBusCallback)
    }
    this.on(event, onceCallback as EventBusCallback)
  }
}

export const eventBus = new EventBus()
export default EventBus
