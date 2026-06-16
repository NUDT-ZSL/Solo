import type { EventCallback, IEventEmitter } from '../types';

export class EventEmitter implements IEventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event: string, data?: unknown): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;
    for (const callback of callbacks) {
      callback(data);
    }
  }
}
