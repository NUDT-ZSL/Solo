import { TrafficDataPoint } from './dataFetcher';

class DataManager {
  private static _instance: DataManager | null = null;
  private _data: TrafficDataPoint[];

  private constructor(data: TrafficDataPoint[]) {
    this._data = data;
  }

  static getInstance(data?: TrafficDataPoint[]): DataManager {
    if (!DataManager._instance) {
      DataManager._instance = new DataManager(data || []);
    }
    return DataManager._instance;
  }

  setData(data: TrafficDataPoint[]): void {
    this._data = data;
  }

  getAllData(): TrafficDataPoint[] {
    return this._data;
  }

  getByHour(hour: number): TrafficDataPoint[] {
    return this._data.filter(d => d.hour === hour);
  }

  getByCongestion(minLevel: number): TrafficDataPoint[] {
    return this._data.filter(d => d.congestionIndex >= minLevel);
  }

  getByRegion(region: string): TrafficDataPoint[] {
    if (region === 'all') {
      return this._data;
    }
    return this._data.filter(d => d.region === region);
  }

  getFilteredData(hour: number, minCongestion: number, region: string): TrafficDataPoint[] {
    return this._data.filter(
      d => d.hour === hour && d.congestionIndex >= minCongestion && (region === 'all' || d.region === region)
    );
  }

  getHourlyAvgCongestion(intersectionId: string): number[] {
    const result: number[] = [];
    for (let h = 0; h < 24; h++) {
      const points = this._data.filter(d => d.intersectionId === intersectionId && d.hour === h);
      if (points.length === 0) {
        result.push(0);
      } else {
        const avg = points.reduce((sum, p) => sum + p.congestionIndex, 0) / points.length;
        result.push(avg);
      }
    }
    return result;
  }

  getIntersectionPeakTraffic(intersectionId: string): number {
    const points = this._data.filter(d => d.intersectionId === intersectionId);
    if (points.length === 0) return 0;
    return Math.max(...points.map(p => p.vehicleCount));
  }

  getHourlyTrend(intersectionId: string, currentHour: number): { hours: number[]; congestions: number[] } {
    const hourlyAvg = this.getHourlyAvgCongestion(intersectionId);
    const hours: number[] = [];
    const congestions: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const h = (currentHour - i + 24) % 24;
      hours.push(h);
      congestions.push(hourlyAvg[h]);
    }
    return { hours, congestions };
  }
}

export { DataManager };
