type EventCallback = (...args: any[]) => void;

interface EventBus {
  on(event: string, callback: EventCallback): () => void;
  off(event: string, callback: EventCallback): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, callback: EventCallback): () => void;
}

class EventBusImpl implements EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`EventBus error in "${event}":`, e);
        }
      });
    }
  }

  once(event: string, callback: EventCallback): () => void {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }
}

export const eventBus: EventBus = new EventBusImpl();

export const EVENTS = {
  HISTORY_RESTORE: 'history:restore',
  REGIONS_UPDATED: 'regions:updated',
  IMAGE_LOADED: 'image:loaded',
  REGION_SELECTED: 'region:selected',
} as const;
