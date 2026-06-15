type EventHandler<T = unknown> = (payload: T) => void;

interface EventMap {
  [key: string]: EventHandler[];
}

class EventBus {
  private events: EventMap = {};

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler as EventHandler);
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(
      (h) => h !== (handler as EventHandler)
    );
  }

  emit<T = unknown>(event: string, payload?: T): void {
    if (!this.events[event]) return;
    this.events[event].forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`EventBus error on "${event}":`, err);
      }
    });
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const wrapped: EventHandler<T> = (payload) => {
      handler(payload);
      this.off(event, wrapped);
    };
    return this.on(event, wrapped);
  }

  clear(): void {
    this.events = {};
  }
}

export const eventBus = new EventBus();

export type { EventHandler };
export { EventBus };
