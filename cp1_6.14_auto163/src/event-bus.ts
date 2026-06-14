import { EventCallback } from './types';

type ListenerMap = Map<string, Set<EventCallback>>;

class EventBus {
  private listeners: ListenerMap = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[EventBus] Error in listener for "${event}":`, e);
        }
      });
    }
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  once(event: string, callback: EventCallback): void {
    const wrapper = (data?: any) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  clear(): void {
    this.listeners.clear();
  }
}

const eventBus = new EventBus();
export default eventBus;
export { EventBus };
