type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    const callbacks = this.events.get(event)!;
    callbacks.push(callback);

    return () => {
      this.off(event, callback);
    };
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;

    callbacks.forEach((cb) => {
      try {
        cb(...args);
      } catch (e) {
        console.error(`EventBus error in "${event}":`, e);
      }
    });
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus();

export const EVENTS = {
  DATA_UPDATED: 'data:updated',
  TIME_CHANGED: 'time:changed',
  STATION_POSITIONS_UPDATED: 'stations:positions',
  STATION_HOVER: 'station:hover',
  STATION_CLICK: 'station:click',
  PLAY_STATE_CHANGED: 'play:state',
  SPEED_CHANGED: 'speed:changed',
} as const;
