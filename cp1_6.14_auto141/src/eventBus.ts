export interface EarthquakeParams {
  longitude: number;
  latitude: number;
  magnitude: number;
  depth: number;
}

export interface TerrainData {
  displacements: Float32Array;
  timestamp: number;
  progress: number;
}

export interface PerformanceReport {
  fps: number;
  particleCount: number;
}

type EventType =
  | 'earthquake:trigger'
  | 'terrain:update'
  | 'performance:report';

type EventDataMap = {
  'earthquake:trigger': EarthquakeParams;
  'terrain:update': TerrainData;
  'performance:report': PerformanceReport;
};

type Listener<T extends EventType> = (data: EventDataMap[T]) => void;

class EventBus {
  private listeners: Map<EventType, Set<Listener<EventType>>> = new Map();

  on<T extends EventType>(event: T, listener: Listener<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<EventType>);
  }

  off<T extends EventType>(event: T, listener: Listener<T>): void {
    this.listeners.get(event)?.delete(listener as Listener<EventType>);
  }

  emit<T extends EventType>(event: T, data: EventDataMap[T]): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
