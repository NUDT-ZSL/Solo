export class EventEmitter<EventMap extends Record<string, unknown>> {
  private listeners: { [K in keyof EventMap]?: Array<(payload: EventMap[K]) => void> } =
    {}

  on<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event]!.push(listener)
  }

  off<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => void): void {
    const list = this.listeners[event]
    if (!list) return
    this.listeners[event] = list.filter(fn => fn !== listener)
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const list = this.listeners[event]
    if (!list) return
    for (const listener of list) {
      listener(payload)
    }
  }
}
