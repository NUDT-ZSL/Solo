/* =========================================================
 * event-bus.ts —— 简易事件总线（发布-订阅模式）
 * 职责：在 DataEngine 与 SceneManager / UIPanel 之间松耦合通信
 *
 * 调用关系：
 *   DataEngine  → emit("data:update")  → 发布数据更新事件
 *   SceneManager → on("data:update")   → 订阅并驱动3D场景更新
 *   UIPanel      → on("data:update")   → 订阅并驱动UI面板刷新
 * ========================================================= */

export type EventHandler = (...args: any[]) => void;

export interface FloorData {
  floor: number;
  energy: number;
  people: number;
  alertLevel: 0 | 1 | 2 | 3;
}

export interface BuildingData {
  floors: FloorData[];
  timestamp: number;
}

export type ViewMode = 'overhead' | 'front' | 'free';

export interface EventMap {
  'data:update': BuildingData;
  'floor:select': number;
  'view:change': ViewMode;
}

type EventName = keyof EventMap;

export class EventBus {
  private handlers: Map<EventName, Set<EventHandler>> = new Map();

  on<K extends EventName>(event: K, handler: (data: EventMap[K]) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends EventName>(event: K, handler: (data: EventMap[K]) => void): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<K extends EventName>(event: K, data: EventMap[K]): void {
    this.handlers.get(event)?.forEach((h) => h(data));
  }

  clear(): void {
    this.handlers.forEach((set) => set.clear());
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
