type EventCallback = (data?: unknown) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}

export const eventBus = new EventBus();

export type ColorSelectedEvent = { hue: number; saturation: number; lightness: number; hex: string };
export type HarmonyGeneratedEvent = { schemes: Record<string, string[]> };
export type PaletteSaveEvent = { name: string; colors: string[] };
export type PaletteDeleteEvent = { id: string };
export type PaletteLoadEvent = { id: string; name: string; colors: string[] };
export type ColorCardClickEvent = { hex: string };
