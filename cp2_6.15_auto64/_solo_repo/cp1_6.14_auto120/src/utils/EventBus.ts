import { PollutantData, StationData } from '../data/types';

export interface ProcessedStationData {
  id: string;
  name: string;
  position: { x: number; y: number };
  pollutants: PollutantData;
  lat: number;
  lng: number;
}

export interface ProcessedTimeData {
  timestamp: number;
  timeLabel: string;
  stations: ProcessedStationData[];
}

export interface StationPositionData {
  id: string;
  lat: number;
  lng: number;
}

export interface StationRankingItem {
  id: string;
  name: string;
  value: number;
}

export type PlaySpeed = 1 | 2 | 5;

export interface EventMap {
  'data:updated': [data: ProcessedTimeData];
  'time:changed': [index: number];
  'stations:positions': [positions: StationPositionData[]];
  'station:hover': [stationId: string | null];
  'station:click': [station: ProcessedStationData | null];
  'play:state': [isPlaying: boolean];
  'speed:changed': [speed: PlaySpeed];
  'data:loaded': [];
  'data:error': [error: Error];
}

export type EventName = keyof EventMap;

type EventCallback<E extends EventName> = (...args: EventMap[E]) => void;

class EventBus {
  private events: Map<EventName, Set<EventCallback<EventName>>> = new Map();

  on<E extends EventName>(event: E, callback: EventCallback<E>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    const callbacks = this.events.get(event)! as Set<EventCallback<E>>;
    callbacks.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  off<E extends EventName>(event: E, callback: EventCallback<E>): void {
    const callbacks = this.events.get(event) as Set<EventCallback<E>> | undefined;
    if (!callbacks) return;
    callbacks.delete(callback);
  }

  emit<E extends EventName>(event: E, ...args: EventMap[E]): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;

    callbacks.forEach((cb) => {
      try {
        (cb as EventCallback<E>)(...args);
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

export const EVENTS: Record<EventName, EventName> = {
  'data:updated': 'data:updated',
  'time:changed': 'time:changed',
  'stations:positions': 'stations:positions',
  'station:hover': 'station:hover',
  'station:click': 'station:click',
  'play:state': 'play:state',
  'speed:changed': 'speed:changed',
  'data:loaded': 'data:loaded',
  'data:error': 'data:error',
} as const;
