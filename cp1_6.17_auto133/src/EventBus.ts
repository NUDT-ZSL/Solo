export type TimePeriod = 'morning' | 'noon' | 'dusk' | 'night';

export interface EventTypes {
  TIME_PERIOD_CHANGE: { period: TimePeriod };
  COLOR_TEMP_CHANGE: { temperature: number };
  LIGHT_INTENSITY_CHANGE: { intensity: number };
  TABLE_COLOR_CHANGE: { color: string };
  TABLE_ROUGHNESS_CHANGE: { roughness: number };
  TABLE_METALNESS_CHANGE: { metalness: number };
  GLASS_TRANSMISSION_CHANGE: { transmission: number };
  GET_STATS_REQUEST: undefined;
  GET_STATS_RESPONSE: { lightCount: number; triangleCount: number };
}

type EventCallback<K extends keyof EventTypes> = (data: EventTypes[K]) => void;

class EventBus {
  private listeners: Map<keyof EventTypes, Set<EventCallback<any>>> = new Map();

  on<K extends keyof EventTypes>(event: K, callback: EventCallback<K>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  emit<K extends keyof EventTypes>(event: K, data: EventTypes[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  off<K extends keyof EventTypes>(event: K, callback: EventCallback<K>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }
}

export default EventBus;
