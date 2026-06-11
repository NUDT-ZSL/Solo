/**
 * ============================================================
 *  src/core/dataManager.ts — 数据轮询 & 数据流分发
 * ============================================================
 *
 *  【职责】
 *    1. 向后端 GET /api/devices 拉取设备列表（默认 2000ms 间隔）
 *    2. 采用递归 setTimeout + 时间戳补偿，避免请求堆积并控制间隔在 ±200ms
 *    3. 通过 RxJS Subject (data$) 将数据广播给订阅者
 *    4. 后端不可达时自动切换本地 fallback 模拟数据，保证 UI 不中断
 *
 *  【上游调用】
 *    — main.ts:            dataManager.startPolling(2000) / .stopPolling()
 *    — deviceRenderer.ts:  dataManager.data$.subscribe()
 *
 *  【下游依赖】
 *    — server/mockServer.js:  GET http://localhost:3001/api/devices
 *    — 浏览器 fetch API + AbortController (3s 超时)
 *
 *  【数据流向】
 *    fetch('/api/devices') ──► response.json() ──► dataSubject.next(devices)
 *                                                        │
 *                              ┌─────────────────────────┼─────────────────────────┐
 *                              ▼                         ▼                         ▼
 *                   deviceRenderer.syncDevices  hudPanel.setTotalDevices  hudPanel.updateDeviceData
 *                   (3D 创建立方体+光环)        (HUD 计数)                  (仪表盘动画)
 * ============================================================
 */

import { Subject, Observable } from 'rxjs';

export type DeviceStatus = 'normal' | 'alert' | 'offline';

export interface DeviceMetrics {
  temperature: number;
  rpm: number;
  load: number;
}

export interface DevicePosition {
  x: number;
  y: number;
  z: number;
}

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  position: DevicePosition;
  metrics: DeviceMetrics;
  lastUpdate: number;
}

export interface DeviceDataResponse {
  timestamp: number;
  count: number;
  devices: Device[];
}

export const STATUS_COLORS: Record<DeviceStatus, number> = {
  normal: 0x00ff88,
  alert: 0xff8800,
  offline: 0xff3344
};

export const STATUS_COLORS_STR: Record<DeviceStatus, string> = {
  normal: '#00ff88',
  alert: '#ff8800',
  offline: '#ff3344'
};

export const STATUS_LABELS: Record<DeviceStatus, string> = {
  normal: '运行正常',
  alert: '告警',
  offline: '离线'
};

class DataManager {
  private dataSubject = new Subject<Device[]>();
  private errorSubject = new Subject<Error>();
  private serverAvailable = false;
  private fallbackDevices: Device[] = [];

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollIntervalMs = 2000;
  private isPolling = false;
  private isFetching = false;

  private lastScheduledAt = 0;
  private lastActualFiredAt = 0;
  private driftMs = 0;

  private readonly MIN_INTERVAL = 1800;
  private readonly MAX_INTERVAL = 2200;
  private readonly TARGET_JITTER = 200;
  private readonly API_URL = 'http://localhost:3001/api/devices';

  public readonly data$: Observable<Device[]> = this.dataSubject.asObservable();
  public readonly error$: Observable<Error> = this.errorSubject.asObservable();

  constructor() {
    this.generateFallbackData();
  }

  private generateFallbackData() {
    const names = [
      'CNC-001', 'CNC-002', 'CNC-003', 'CNC-004', 'CNC-005',
      'ROBOT-001', 'ROBOT-002', 'ROBOT-003', 'ROBOT-004',
      'CONV-001', 'CONV-002', 'CONV-003', 'CONV-004', 'CONV-005',
      'PLC-001', 'PLC-002', 'PLC-003', 'PLC-004', 'PLC-005', 'PLC-006',
      'MOTOR-001', 'MOTOR-002', 'MOTOR-003', 'MOTOR-004', 'MOTOR-005',
      'SENSOR-A1', 'SENSOR-A2', 'SENSOR-B1', 'SENSOR-B2', 'SENSOR-C1'
    ];
    const rows = 5, cols = 6;
    const sx = 12, sz = 10;
    const stx = -((cols - 1) * sx) / 2;
    const stz = -((rows - 1) * sz) / 2;
    let idx = 0;
    const statuses: DeviceStatus[] = ['normal', 'alert', 'offline'];
    const weights = [0.7, 0.2, 0.1];

    for (let r = 0; r < rows && idx < names.length; r++) {
      for (let c = 0; c < cols && idx < names.length; c++) {
        const rand = Math.random();
        let status: DeviceStatus = 'normal';
        let cum = 0;
        for (let i = 0; i < statuses.length; i++) {
          cum += weights[i];
          if (rand < cum) { status = statuses[i]; break; }
        }
        this.fallbackDevices.push({
          id: `DEV-${String(idx + 1).padStart(3, '0')}`,
          name: names[idx],
          status,
          position: {
            x: stx + c * sx + (Math.random() - 0.5) * 2,
            y: 1.2,
            z: stz + r * sz + (Math.random() - 0.5) * 2
          },
          metrics: {
            temperature: status === 'offline' ? 0 : Math.round((45 + Math.random() * 20) * 10) / 10,
            rpm: status === 'offline' ? 0 : Math.floor(800 + Math.random() * 2200),
            load: status === 'offline' ? 0 : Math.round((30 + Math.random() * 65) * 10) / 10
          },
          lastUpdate: Date.now()
        });
        idx++;
      }
    }
  }

  /**
   * 启动轮询：使用递归 setTimeout + 时间戳补偿算法。
   * 每次执行完毕后根据实际耗时和累计漂移计算下一次的延迟，
   * 保证整体间隔稳定在 intervalMs ± TARGET_JITTER 范围内。
   */
  public startPolling(intervalMs: number = 2000): void {
    if (this.isPolling) return;
    this.isPolling = true;
    this.pollIntervalMs = Math.max(this.MIN_INTERVAL, Math.min(this.MAX_INTERVAL, intervalMs));
    this.lastScheduledAt = performance.now();
    this.lastActualFiredAt = performance.now();
    this.driftMs = 0;

    this.fetchOnce().finally(() => {
      this.scheduleNext();
    });
  }

  public stopPolling(): void {
    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private scheduleNext() {
    if (!this.isPolling) return;

    const now = performance.now();
    const elapsedSinceScheduled = now - this.lastScheduledAt;
    this.driftMs += (elapsedSinceScheduled - this.pollIntervalMs);

    let delay = this.pollIntervalMs - this.driftMs;
    delay = Math.max(0, Math.min(this.pollIntervalMs + this.TARGET_JITTER, delay));
    delay = Math.max(this.MIN_INTERVAL - this.TARGET_JITTER, delay);

    this.lastScheduledAt = now + delay;

    this.pollTimer = setTimeout(() => {
      if (!this.isPolling) return;
      this.lastActualFiredAt = performance.now();

      if (this.isFetching) {
        this.scheduleNext();
        return;
      }

      this.fetchOnce().finally(() => {
        this.scheduleNext();
      });
    }, Math.round(delay));
  }

  private async fetchOnce(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(this.API_URL, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: DeviceDataResponse = await response.json();
      this.serverAvailable = true;
      this.dataSubject.next(data.devices);
    } catch (err) {
      this.serverAvailable = false;
      this.errorSubject.next(err instanceof Error ? err : new Error(String(err)));
      this.updateFallbackData();
      this.dataSubject.next([...this.fallbackDevices]);
    } finally {
      this.isFetching = false;
    }
  }

  private updateFallbackData() {
    this.fallbackDevices = this.fallbackDevices.map(d => {
      const nd = { ...d, metrics: { ...d.metrics }, position: { ...d.position } };
      if (nd.status === 'offline') {
        nd.metrics.temperature = Math.max(0, nd.metrics.temperature - 0.5);
        nd.metrics.rpm = Math.max(0, nd.metrics.rpm - 50);
        nd.metrics.load = Math.max(0, nd.metrics.load - 2);
      } else {
        nd.metrics.temperature = Math.max(20, Math.min(120,
          nd.metrics.temperature + (Math.random() - 0.5) * 3));
        nd.metrics.rpm = Math.max(100, Math.min(4000,
          nd.metrics.rpm + Math.floor((Math.random() - 0.5) * 100)));
        nd.metrics.load = Math.max(5, Math.min(99,
          nd.metrics.load + (Math.random() - 0.5) * 5));
        if (nd.metrics.temperature > 90 || nd.metrics.load > 90) {
          nd.status = Math.random() < 0.6 ? 'alert' : 'normal';
        }
      }
      if (Math.random() < 0.03) {
        const arr: DeviceStatus[] = ['normal', 'alert', 'offline'];
        nd.status = arr[Math.floor(Math.random() * arr.length)];
      }
      nd.metrics.temperature = Math.round(nd.metrics.temperature * 10) / 10;
      nd.metrics.load = Math.round(nd.metrics.load * 10) / 10;
      nd.lastUpdate = Date.now();
      return nd;
    });
  }

  public getCurrentDevices(): Device[] {
    return [...this.fallbackDevices];
  }

  public isServerConnected(): boolean {
    return this.serverAvailable;
  }
}

export const dataManager = new DataManager();
