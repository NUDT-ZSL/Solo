import type { EventMap } from './types';

type EventCallback<T extends keyof EventMap> = (payload: EventMap[T]) => void;

class EventBus {
  private listeners: Map<keyof EventMap, Set<EventCallback<keyof EventMap>>>;

  constructor() {
    this.listeners = new Map();
  }

  on<T extends keyof EventMap>(event: T, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<keyof EventMap>);
  }

  off<T extends keyof EventMap>(event: T, callback: EventCallback<T>): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback as EventCallback<keyof EventMap>);
    }
  }

  emit<T extends keyof EventMap>(event: T, payload: EventMap[T]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(payload));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
