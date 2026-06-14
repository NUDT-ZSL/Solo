type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>>;

  constructor() {
    this.events = new Map();
  }

  on(eventName: string, callback: EventCallback): void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName)!.add(callback);
  }

  off(eventName: string, callback: EventCallback): void {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(eventName);
      }
    }
  }

  emit(eventName: string, ...args: any[]): void {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(...args);
      });
    }
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

export const EVENTS = {
  WEATHER_DATA_UPDATED: 'weather:data-updated',
  FORECAST_SELECTED: 'forecast:selected',
  CHART_DATA_READY: 'chart:data-ready',
  LOADING_STATE: 'app:loading',
  ERROR_OCCURRED: 'app:error',
} as const;
