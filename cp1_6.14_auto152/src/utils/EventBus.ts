import type { GameEvents, EventName } from '../types';

type Handler<T> = (data: T) => void;

export class EventBus {
  private handlers: Map<string, Set<Handler<any>>> = new Map();
  private static instance: EventBus;

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<E extends EventName>(event: E, handler: Handler<GameEvents[E]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off<E extends EventName>(event: E, handler: Handler<GameEvents[E]>): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<E extends EventName>(event: E, data: GameEvents[E]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.forEach((h) => {
      try {
        h(data);
      } catch (err) {
        console.error(`[EventBus] handler error for ${event}:`, err);
      }
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = EventBus.getInstance();
