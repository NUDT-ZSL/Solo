import axios, { AxiosError, type AxiosResponse } from 'axios';
import type { Station, TimeSeriesPoint, WeatherData, Concentrations } from './config';

const API_BASE = '/api';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  isNetworkError: boolean;
}

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const apiError: ApiError = {
      message: '请求失败',
      isNetworkError: !error.response,
    };

    if (error.code) {
      apiError.code = error.code;
    }

    if (error.response) {
      apiError.status = error.response.status;
      const data = error.response.data as { error?: string; message?: string };
      apiError.message = data?.error || data?.message || `HTTP ${error.response.status}`;
    } else if (error.request) {
      apiError.message = '网络连接异常，请检查服务器是否启动';
    } else {
      apiError.message = error.message || '未知错误';
    }

    return Promise.reject(apiError);
  }
);

function handleApiError(error: unknown, context: string): never {
  const apiError = error as ApiError;
  console.error(`[apiService] ${context}:`, apiError);
  throw new Error(apiError.message || `${context}失败`);
}

export async function fetchStations(hour: number = 12): Promise<Station[]> {
  try {
    const response = await apiClient.get<Station[]>('/stations', {
      params: { hour },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, '获取站点数据');
  }
}

export async function fetchTimeSeries(stationId: string): Promise<TimeSeriesPoint[]> {
  try {
    if (!stationId) {
      throw new Error('stationId不能为空');
    }
    const response = await apiClient.get<TimeSeriesPoint[]>('/timeseries', {
      params: { stationId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, '获取时间序列数据');
  }
}

export async function fetchWeather(
  stationId: string,
  hour?: number
): Promise<WeatherData[]> {
  try {
    if (!stationId) {
      throw new Error('stationId不能为空');
    }
    const params: Record<string, any> = { stationId };
    if (hour !== undefined) {
      if (hour < 0 || hour > 23) {
        throw new Error('hour参数必须在0-23之间');
      }
      params.hour = hour;
    }
    const response = await apiClient.get<WeatherData[]>('/weather', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error, '获取气象数据');
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
