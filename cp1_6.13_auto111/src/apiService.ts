import axios from 'axios';
import type { Station, TimeSeriesPoint, WeatherData, Concentrations } from './config';

const API_BASE = '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchStations(hour: number = 12): Promise<Station[]> {
  try {
    const response = await apiClient.get<Station[]>('/stations', {
      params: { hour },
    });
    return response.data;
  } catch (error) {
    console.error('[apiService] 获取站点数据失败:', error);
    throw new Error('获取站点数据失败，请稍后重试');
  }
}

export async function fetchTimeSeries(stationId: string): Promise<TimeSeriesPoint[]> {
  try {
    const response = await apiClient.get<TimeSeriesPoint[]>('/timeseries', {
      params: { stationId },
    });
    return response.data;
  } catch (error) {
    console.error('[apiService] 获取时间序列数据失败:', error);
    throw new Error('获取时间序列数据失败，请稍后重试');
  }
}

export async function fetchWeather(
  stationId: string,
  hour?: number
): Promise<WeatherData[]> {
  try {
    const params: Record<string, any> = { stationId };
    if (hour !== undefined) {
      params.hour = hour;
    }
    const response = await apiClient.get<WeatherData[]>('/weather', { params });
    return response.data;
  } catch (error) {
    console.error('[apiService] 获取气象数据失败:', error);
    throw new Error('获取气象数据失败，请稍后重试');
  }
}

export function calculateCompositeIndex(concentrations: Concentrations): number {
  const max = 300;
  const norm = (v: number) => Math.min(v / max, 1);
  const avg =
    (norm(concentrations.PM25) +
      norm(concentrations.PM10) +
      norm(concentrations.O3) +
      norm(concentrations.NO2)) /
    4;
  return Math.round(avg * 100);
}

export function concentrationToHeight(
  concentration: number,
  maxConcentration: number = 300,
  maxHeight: number = 50
): number {
  const ratio = Math.min(Math.max(concentration / maxConcentration, 0), 1);
  return ratio * maxHeight;
}

export function interpolateColor(
  colorLow: string,
  colorHigh: string,
  ratio: number
): string {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const hex = (c: string) => parseInt(c, 16);

  const r1 = hex(colorLow.slice(1, 3));
  const g1 = hex(colorLow.slice(3, 5));
  const b1 = hex(colorLow.slice(5, 7));

  const r2 = hex(colorHigh.slice(1, 3));
  const g2 = hex(colorHigh.slice(3, 5));
  const b2 = hex(colorHigh.slice(5, 7));

  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
