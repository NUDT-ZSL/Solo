type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return () => {
      this.events.get(event)?.delete(callback);
    };
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`[EventBus] Error in callback for "${event}":`, e);
        }
      });
    }
  }

  off(event: string, callback?: EventCallback): void {
    if (!callback) {
      this.events.delete(event);
      return;
    }
    this.events.get(event)?.delete(callback);
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

export type { EventCallback };
