import { PlannedRoute, TrackPoint, RideReport, Note, RideRecord } from './types';

interface EventMap {
  'route:planned': PlannedRoute;
  'ride:start': RideRecord;
  'gps:update': TrackPoint;
  'ride:end': RideRecord;
  'report:generated': RideReport;
  'note:add': Note;
  'record:saved': RideRecord;
}

type EventHandler<T> = (data: T) => void;

class EventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

export const eventBus = new EventBus();
export { EventBus };
