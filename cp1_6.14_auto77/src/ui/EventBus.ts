type EventCallback<T = unknown> = (data: T) => void;

export class EventBus {
  private static instance: EventBus;
  private events: Map<string, Set<EventCallback>> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback as EventCallback);
    return () => this.off(event, callback);
  }

  off<T = unknown>(event: string, callback: EventCallback<T>): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit<T = unknown>(event: string, data?: T): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = EventBus.getInstance();

export enum Events {
  PARAMS_UPDATED = 'params:updated',
  RESET_VIEW = 'view:reset',
  TAKE_SCREENSHOT = 'screenshot:take',
  FRACTAL_DATA_READY = 'fractal:dataReady',
  FRACTAL_CALCULATING = 'fractal:calculating',
  SHOW_TOAST = 'toast:show',
  CONTROL_PANEL_TOGGLE = 'panel:toggle',
}

export interface FractalParams {
  cReal: number;
  cImag: number;
  maxIterations: number;
  colorMap: 'flame' | 'ocean' | 'camo' | 'neon';
}

export interface FractalData {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  wireframePositions: Float32Array;
}

export interface ToastMessage {
  message: string;
  type?: 'info' | 'error' | 'success';
  duration?: number;
}
