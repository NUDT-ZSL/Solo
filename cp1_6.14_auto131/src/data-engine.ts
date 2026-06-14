/* =========================================================
 * data-engine.ts —— 楼宇实时数据模拟引擎
 * 职责：每 2 秒生成 10 层楼的能耗 / 人流量 / 告警级别数据，
 *       通过 EventBus 向外发布 data:update 事件。
 *
 * 调用关系：
 *   main.ts       → new DataEngine(eventBus).start()  启动引擎
 *   DataEngine    → eventBus.emit("data:update")      推送数据
 *   SceneManager  → 订阅事件更新 3D 场景
 *   UIPanel       → 订阅事件更新控制面板
 * ========================================================= */

import { BuildingData, EventBus, FloorData } from './event-bus';

export class DataEngine {
  private bus: EventBus;
  private timer: number | null = null;
  private floors = 10;
  private currentData: BuildingData | null = null;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  private genFloor(baseFloor: number, prev?: FloorData): FloorData {
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    let energy = rand(80, 520);
    let people = Math.floor(rand(30, 480));

    if (prev) {
      energy = lerp(prev.energy, energy, 0.35);
      people = Math.floor(lerp(prev.people, people, 0.3));
    }

    const alertRoll = Math.random();
    let alertLevel: 0 | 1 | 2 | 3 = 0;
    if (alertRoll > 0.94) alertLevel = 3;
    else if (alertRoll > 0.86) alertLevel = 2;
    else if (alertRoll > 0.65) alertLevel = 1;

    return {
      floor: baseFloor,
      energy: Math.round(energy * 10) / 10,
      people,
      alertLevel
    };
  }

  private generate(): BuildingData {
    const prev = this.currentData;
    const floors: FloorData[] = [];
    for (let i = 1; i <= this.floors; i++) {
      const p = prev?.floors.find((f) => f.floor === i);
      floors.push(this.genFloor(i, p));
    }
    const data: BuildingData = { floors, timestamp: Date.now() };
    this.currentData = data;
    return data;
  }

  start(intervalMs = 2000): void {
    if (this.timer !== null) return;
    this.bus.emit('data:update', this.generate());
    this.timer = window.setInterval(() => {
      this.bus.emit('data:update', this.generate());
    }, intervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  getSnapshot(): BuildingData | null {
    return this.currentData;
  }
}
