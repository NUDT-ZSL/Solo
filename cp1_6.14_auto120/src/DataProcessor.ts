import { eventBus, EVENTS } from '../utils/EventBus';
import {
  mockAirQualityData,
  AirQualityDataset,
  StationData,
  PollutantData,
  TimePointData,
} from '../data/mockData';

export interface ProcessedStationData {
  id: string;
  name: string;
  position: { x: number; y: number };
  pollutants: PollutantData;
}

export interface ProcessedTimeData {
  timestamp: number;
  timeLabel: string;
  stations: ProcessedStationData[];
}

class DataProcessor {
  private dataset: AirQualityDataset;
  private currentTimeIndex: number = 0;
  private stationPositions: Map<string, { x: number; y: number }> = new Map();

  constructor() {
    this.dataset = mockAirQualityData;
  }

  init(): void {
    this.emitStationPositions();
    this.emitCurrentData();
  }

  getStations(): StationData[] {
    return this.dataset.stations;
  }

  getTimePoints(): TimePointData[] {
    return this.dataset.timePoints;
  }

  getTotalHours(): number {
    return this.dataset.timePoints.length;
  }

  getCurrentTimeIndex(): number {
    return this.currentTimeIndex;
  }

  setCurrentTimeIndex(index: number): void {
    const clamped = Math.max(0, Math.min(this.dataset.timePoints.length - 1, index));
    if (clamped !== this.currentTimeIndex) {
      this.currentTimeIndex = clamped;
      this.emitCurrentData();
      eventBus.emit(EVENTS.TIME_CHANGED, this.currentTimeIndex);
    }
  }

  setStationPosition(stationId: string, x: number, y: number): void {
    this.stationPositions.set(stationId, { x, y });
  }

  private emitStationPositions(): void {
    const positions = this.dataset.stations.map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
    }));
    eventBus.emit(EVENTS.STATION_POSITIONS_UPDATED, positions);
  }

  private emitCurrentData(): void {
    const timePoint = this.dataset.timePoints[this.currentTimeIndex];
    if (!timePoint) return;

    const stations: ProcessedStationData[] = this.dataset.stations.map((station) => {
      const pollutants = timePoint.stations[station.id] || {
        pm25: 0,
        pm10: 0,
        o3: 0,
        no2: 0,
      };
      const pos = this.stationPositions.get(station.id) || { x: 0, y: 0 };

      return {
        id: station.id,
        name: station.name,
        position: pos,
        pollutants,
      };
    });

    const timeLabel = this.formatTime(timePoint.timestamp);

    const data: ProcessedTimeData = {
      timestamp: timePoint.timestamp,
      timeLabel,
      stations,
    };

    eventBus.emit(EVENTS.DATA_UPDATED, data);
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getAveragePollutants(): PollutantData {
    const timePoint = this.dataset.timePoints[this.currentTimeIndex];
    if (!timePoint) return { pm25: 0, pm10: 0, o3: 0, no2: 0 };

    const stationIds = Object.keys(timePoint.stations);
    const totals: PollutantData = { pm25: 0, pm10: 0, o3: 0, no2: 0 };

    stationIds.forEach((id) => {
      const data = timePoint.stations[id];
      totals.pm25 += data.pm25;
      totals.pm10 += data.pm10;
      totals.o3 += data.o3;
      totals.no2 += data.no2;
    });

    const count = stationIds.length || 1;
    return {
      pm25: Math.round((totals.pm25 / count) * 10) / 10,
      pm10: Math.round((totals.pm10 / count) * 10) / 10,
      o3: Math.round((totals.o3 / count) * 10) / 10,
      no2: Math.round((totals.no2 / count) * 10) / 10,
    };
  }

  getStationRanking(pollutant: keyof PollutantData): { id: string; name: string; value: number }[] {
    const timePoint = this.dataset.timePoints[this.currentTimeIndex];
    if (!timePoint) return [];

    return this.dataset.stations
      .map((station) => ({
        id: station.id,
        name: station.name,
        value: timePoint.stations[station.id]?.[pollutant] || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }
}

export const dataProcessor = new DataProcessor();
