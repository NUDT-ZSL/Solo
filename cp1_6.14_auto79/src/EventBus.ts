import { EventType, EventPayloadMap } from './types';

type Handler<T extends EventType> = (payload: EventPayloadMap[T]) => void;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<EventType, Set<Function>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on<T extends EventType>(event: T, handler: Handler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as Function);
  }

  public off<T extends EventType>(event: T, handler: Handler<T>): void {
    this.handlers.get(event)?.delete(handler as Function);
  }

  public emit<T extends EventType>(event: T, payload: EventPayloadMap[T]): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        (handler as Handler<T>)(payload);
      } catch (e) {
        console.error(`EventBus error in handler for ${event}:`, e);
      }
    });
  }

  public clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = EventBus.getInstance();
