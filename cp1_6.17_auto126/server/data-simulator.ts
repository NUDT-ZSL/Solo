import { v4 as uuidv4 } from 'uuid';

const BEIJING_CENTER = { lat: 39.9042, lng: 116.4074 };
const RADIUS_DEG = 0.05;
const MAX_BIKES = 120;

export interface Bike {
  id: string;
  lat: number;
  lng: number;
  battery: number;
  rented: boolean;
  lastUsed: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface SimulatedData {
  bikes: Bike[];
  heatmap: HeatmapPoint[];
  throttled: boolean;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateRandomOffset(): { lat: number; lng: number } {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * RADIUS_DEG;
  return {
    lat: Math.cos(angle) * distance,
    lng: Math.sin(angle) * distance
  };
}

function generateBike(id?: string, prev?: Bike): Bike {
  const offset = generateRandomOffset();
  const baseLat = prev ? prev.lat : BEIJING_CENTER.lat;
  const baseLng = prev ? prev.lng : BEIJING_CENTER.lng;
  return {
    id: id || uuidv4().slice(0, 8).toUpperCase(),
    lat: baseLat + (prev ? randomInRange(-0.003, 0.003) : offset.lat),
    lng: baseLng + (prev ? randomInRange(-0.003, 0.003) : offset.lng),
    battery: Math.round(randomInRange(20, 100)),
    rented: Math.random() < 0.2,
    lastUsed: Date.now() - Math.round(randomInRange(0, 3600000))
  };
}

function clampBikePosition(bike: Bike): Bike {
  const dLat = bike.lat - BEIJING_CENTER.lat;
  const dLng = bike.lng - BEIJING_CENTER.lng;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  if (dist > RADIUS_DEG) {
    const ratio = RADIUS_DEG / dist;
    return {
      ...bike,
      lat: BEIJING_CENTER.lat + dLat * ratio,
      lng: BEIJING_CENTER.lng + dLng * ratio
    };
  }
  return bike;
}

export class DataSimulator {
  private bikes: Bike[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Set<(data: SimulatedData) => void> = new Set();
  private refreshInterval: number = 3000;

  constructor() {
    this.initializeBikes();
  }

  private initializeBikes(): void {
    let count = Math.round(randomInRange(50, 100));
    if (count > MAX_BIKES) count = MAX_BIKES;
    this.bikes = [];
    for (let i = 0; i < count; i++) {
      this.bikes.push(clampBikePosition(generateBike()));
    }
  }

  private generateHeatmap(): HeatmapPoint[] {
    const pointCount = Math.round(randomInRange(2, 4));
    const points: HeatmapPoint[] = [];
    const shuffled = [...this.bikes].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(pointCount, shuffled.length); i++) {
      points.push({
        lat: shuffled[i].lat,
        lng: shuffled[i].lng,
        intensity: randomInRange(0.3, 0.8)
      });
    }
    return points;
  }

  public tick(): SimulatedData {
    this.bikes = this.bikes.map((bike) => {
      if (bike.rented) {
        return clampBikePosition(generateBike(bike.id, bike));
      }
      if (Math.random() < 0.15) {
        return clampBikePosition(generateBike(bike.id, bike));
      }
      return bike;
    });

    const targetCount = Math.round(randomInRange(50, 100));
    let throttled = false;

    if (this.bikes.length < targetCount) {
      const availableSlots = MAX_BIKES - this.bikes.length;
      const toAdd = Math.min(targetCount - this.bikes.length, availableSlots);
      if (targetCount - this.bikes.length > availableSlots) {
        throttled = true;
      }
      for (let i = 0; i < toAdd; i++) {
        this.bikes.push(clampBikePosition(generateBike()));
      }
    } else if (this.bikes.length > targetCount) {
      this.bikes = this.bikes.slice(0, targetCount);
    }

    if (this.bikes.length > MAX_BIKES) {
      throttled = true;
      this.bikes = this.bikes.slice(0, MAX_BIKES);
    }

    return {
      bikes: this.bikes,
      heatmap: this.generateHeatmap(),
      throttled
    };
  }

  public start(intervalMs?: number): void {
    if (intervalMs) this.refreshInterval = intervalMs;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      const data = this.tick();
      this.listeners.forEach((fn) => fn(data));
    }, this.refreshInterval);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setRefreshInterval(ms: number): void {
    this.refreshInterval = ms;
    if (this.intervalId) {
      this.start();
    }
  }

  public subscribe(fn: (data: SimulatedData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public getCurrentData(): SimulatedData {
    const throttled = this.bikes.length >= MAX_BIKES;
    return {
      bikes: this.bikes,
      heatmap: this.generateHeatmap(),
      throttled
    };
  }
}

export const dataSimulator = new DataSimulator();
