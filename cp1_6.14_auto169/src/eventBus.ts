import type {
  BuildingType,
  CombatEvent,
  CombatResult,
  LogEntry,
  PlayerId,
} from './types';

export type EventMap = {
  'cell:click': { x: number; y: number };
  'building:place': { x: number; y: number; type: BuildingType };
  'building:upgrade': { x: number; y: number };
  'combat:resolve': CombatEvent;
  'combat:result': CombatResult & { x: number; y: number };
  'unit:move': { unitId: string; x: number; y: number };
  'territory:change': {
    x: number;
    y: number;
    oldOwner: PlayerId;
    newOwner: PlayerId;
  };
  'resource:update': { playerId: PlayerId; amount: number };
  'log:add': Omit<LogEntry, 'id' | 'time'> & { time?: number };
  'game:tick': number;
  'game:end': { winner: PlayerId | 'draw' };
  'state:update': null;
  'menu:close': null;
};

type Listener<T = unknown> = (data: T) => void;

export class EventBus {
  private listeners: Map<keyof EventMap, Set<Listener>> = new Map();

  on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback as Listener);
    return () => {
      set.delete(callback as Listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(data);
      } catch (e) {
        console.error(`[EventBus] Error in listener for ${String(event)}:`, e);
      }
    }
  }

  off<K extends keyof EventMap>(event: K, callback: Listener): void {
    this.listeners.get(event)?.delete(callback);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
