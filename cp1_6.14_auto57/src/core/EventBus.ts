import { AppEvents, EventCallback } from '@/types';

class EventBus {
  private listeners: Map<keyof AppEvents, Set<EventCallback>> = new Map();

  on<K extends keyof AppEvents>(event: K, callback: (data: AppEvents[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
  }

  off<K extends keyof AppEvents>(event: K, callback: (data: AppEvents[K]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
    }
  }

  emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}

export const eventBus = new EventBus();
