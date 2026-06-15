export interface SensorData {
  id: string;
  gridX: number;
  gridY: number;
  aqi: number;
  pm25: number;
  timestamp: number;
}

export type DataListener = (data: SensorData[]) => void;

class EventEmitter {
  private listeners: Map<string, DataListener[]> = new Map();

  on(event: string, listener: DataListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: DataListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: SensorData[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }
}

export class DataGenerator extends EventEmitter {
  private static readonly GRID_SIZE = 10;
  private static readonly SAMPLE_COUNT = 12;
  private static readonly UPDATE_INTERVAL = 2000;
  private static readonly HISTORY_WINDOW = 60000;

  private sensorPositions: { id: string; gridX: number; gridY: number }[] = [];
  private history: SensorData[][] = [];
  private intervalId: number | null = null;
  private isRunning: boolean = false;
  private baseAqi: number = 60;

  constructor() {
    super();
    this.initSensorPositions();
  }

  private initSensorPositions(): void {
    const positions: { id: string; gridX: number; gridY: number }[] = [];
    const usedPositions = new Set<string>();

    while (positions.length < DataGenerator.SAMPLE_COUNT) {
      const gridX = Math.floor(Math.random() * DataGenerator.GRID_SIZE);
      const gridY = Math.floor(Math.random() * DataGenerator.GRID_SIZE);
      const key = `${gridX},${gridY}`;

      if (!usedPositions.has(key)) {
        usedPositions.add(key);
        positions.push({
          id: `sensor-${positions.length.toString().padStart(2, '0')}`,
          gridX,
          gridY
        });
      }
    }

    this.sensorPositions = positions;
  }

  private generateBatch(): SensorData[] {
    const now = Date.now();
    const timeVariation = Math.sin(now / 30000) * 20;

    return this.sensorPositions.map((pos) => {
      const spatialVariation = (pos.gridX + pos.gridY) * 3;
      const randomVariation = (Math.random() - 0.5) * 40;
      const aqi = Math.max(10, Math.min(300, this.baseAqi + timeVariation + spatialVariation + randomVariation));
      const pm25 = aqi * 0.8 + (Math.random() - 0.5) * 10;

      return {
        id: pos.id,
        gridX: pos.gridX,
        gridY: pos.gridY,
        aqi: Math.round(aqi * 10) / 10,
        pm25: Math.round(Math.max(0, pm25) * 10) / 10,
        timestamp: now
      };
    });
  }

  private pushToHistory(data: SensorData[]): void {
    this.history.push(data);
    const cutoffTime = Date.now() - DataGenerator.HISTORY_WINDOW;
    while (this.history.length > 0 && this.history[0][0].timestamp < cutoffTime) {
      this.history.shift();
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const initialBatch = this.generateBatch();
    this.pushToHistory(initialBatch);
    this.emit('data', initialBatch);

    this.intervalId = window.setInterval(() => {
      const batch = this.generateBatch();
      this.pushToHistory(batch);
      this.emit('data', batch);
    }, DataGenerator.UPDATE_INTERVAL);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  pause(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resume(): void {
    if (this.isRunning && this.intervalId === null) {
      this.intervalId = window.setInterval(() => {
        const batch = this.generateBatch();
        this.pushToHistory(batch);
        this.emit('data', batch);
      }, DataGenerator.UPDATE_INTERVAL);
    }
  }

  toggle(): boolean {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
    return this.isRunning;
  }

  setPlaybackTime(timestamp: number): void {
    const data = this.getHistoryAtTime(timestamp);
    if (data) {
      this.emit('data', data);
    }
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getHistory(): SensorData[][] {
    return [...this.history];
  }

  getHistoryAtTime(targetTime: number): SensorData[] | null {
    if (this.history.length === 0) return null;

    let closestIndex = 0;
    let closestDiff = Math.abs(this.history[0][0].timestamp - targetTime);

    for (let i = 1; i < this.history.length; i++) {
      const diff = Math.abs(this.history[i][0].timestamp - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return this.history[closestIndex];
  }

  getSensorPositions(): { id: string; gridX: number; gridY: number }[] {
    return [...this.sensorPositions];
  }

  getUpdateInterval(): number {
    return DataGenerator.UPDATE_INTERVAL;
  }

  getHistoryWindow(): number {
    return DataGenerator.HISTORY_WINDOW;
  }

  getGridSize(): number {
    return DataGenerator.GRID_SIZE;
  }

  getSensorHistory(sensorId: string, limit: number = 10): SensorData[] {
    const result: SensorData[] = [];
    for (let i = this.history.length - 1; i >= 0 && result.length < limit; i--) {
      const sensorData = this.history[i].find((d) => d.id === sensorId);
      if (sensorData) {
        result.unshift(sensorData);
      }
    }
    return result;
  }
}
