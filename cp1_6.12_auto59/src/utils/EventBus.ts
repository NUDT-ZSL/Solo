type EventCallback = (...args: any[]) => void;

export class EventBus {
  private static instance: EventBus;
  private events: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on<T extends keyof any>(event: T, callback: (...args: any[]) => void): void {
    const eventName = String(event);
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName)!.push(callback);
  }

  public off<T extends keyof any>(event: T, callback: (...args: any[]) => void): void {
    const eventName = String(event);
    const callbacks = this.events.get(eventName);
    if (!callbacks) return;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  public emit<T extends keyof any>(event: T, ...args: any[]): void {
    const eventName = String(event);
    const callbacks = this.events.get(eventName);
    if (!callbacks) return;
    for (const callback of callbacks) {
      try {
        callback(...args);
      } catch (e) {
        console.error(`[EventBus] Error in event ${eventName}:`, e);
      }
    }
  }

  public clear(): void {
    this.events.clear();
  }
}

export const eventBus = EventBus.getInstance();
