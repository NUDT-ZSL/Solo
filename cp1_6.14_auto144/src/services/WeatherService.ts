import axios from 'axios';
import type { WeatherData, CurrentWeather, ForecastDay, HourlyData, AirQuality, AqiLevel } from '../types';

type AxiosError = {
  response?: { status?: number; data?: { message?: string } };
  request?: unknown;
  message?: string;
};

function isAxiosError(err: unknown): err is AxiosError {
  return typeof err === 'object' && err !== null && 'response' in err;
}

function normalizeApiError(err: unknown): Error {
  if (isAxiosError(err)) {
    if (err.response) {
      const status = err.response.status;
      const apiMsg = err.response.data?.message;
      if (status === 401) {
        return new Error('API Key 无效，请检查 VITE_OPENWEATHER_API_KEY 配置');
      }
      if (status === 404) {
        return new Error('城市未找到，请检查输入的城市名称');
      }
      if (status === 429) {
        return new Error('API 调用次数超限，请稍后重试');
      }
      if (status && status >= 500) {
        return new Error('服务器暂时不可用，请稍后重试');
      }
      return new Error(apiMsg || `请求失败 (${status})，请稍后重试`);
    }
    if (err.request) {
      return new Error('网络连接失败，请检查网络后重试');
    }
  }
  if (err instanceof Error) {
    return err;
  }
  return new Error('获取天气数据失败，请稍后重试');
}

const API_KEY: string = import.meta.env.VITE_OPENWEATHER_API_KEY ?? '';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

const WEATHER_EMOJIS: Record<string, string> = {
  '01d': '☀️', '01n': '🌙',
  '02d': '⛅', '02n': '☁️',
  '03d': '☁️', '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const AQI_LEVELS: Array<{ min: number; max: number; level: AqiLevel; color: string }> = [
  { min: 0, max: 50, level: '优', color: '#22c55e' },
  { min: 51, max: 100, level: '良', color: '#facc15' },
  { min: 101, max: 150, level: '轻度污染', color: '#f97316' },
  { min: 151, max: 200, level: '中度污染', color: '#ef4444' },
  { min: 201, max: 300, level: '重度污染', color: '#a855f7' },
  { min: 301, max: 500, level: '严重污染', color: '#7c2d12' },
];

function getAqiInfo(aqi: number): { level: AqiLevel; color: string } {
  for (const range of AQI_LEVELS) {
    if (aqi >= range.min && aqi <= range.max) {
      return { level: range.level, color: range.color };
    }
  }
  return { level: '严重污染', color: '#7c2d12' };
}

function getWeatherEmoji(iconCode: string): string {
  return WEATHER_EMOJIS[iconCode] || '🌤️';
}

class WeatherService {
  private async getCoordinates(city: string): Promise<{ lat: number; lon: number; name: string }> {
    if (!API_KEY) {
      throw new Error('未配置 API Key，请在 .env 文件中设置 VITE_OPENWEATHER_API_KEY');
    }
    const response = await axios.get(`${GEO_URL}/direct`, {
      params: { q: city, limit: 1, appid: API_KEY },
    });
    if (!response.data || response.data.length === 0) {
      throw new Error('城市未找到，请检查输入的城市名称');
    }
    return {
      lat: response.data[0].lat,
      lon: response.data[0].lon,
      name: response.data[0].name || city,
    };
  }

  private async fetchFromAPI(city: string): Promise<WeatherData> {
    try {
      const { lat, lon, name } = await this.getCoordinates(city);

      const [weatherResponse, forecastResponse, airQualityResponse] = await Promise.all([
        axios.get(`${BASE_URL}/weather`, {
          params: { lat, lon, appid: API_KEY, units: 'metric', lang: 'zh_cn' },
        }),
        axios.get(`${BASE_URL}/forecast`, {
          params: { lat, lon, appid: API_KEY, units: 'metric', lang: 'zh_cn' },
        }),
        axios.get(`${BASE_URL}/air_pollution`, {
          params: { lat, lon, appid: API_KEY },
        }),
      ]);

      const weatherData = weatherResponse.data;
      const forecastData = forecastResponse.data;
      const aqiData = airQualityResponse.data;

      const current: CurrentWeather = {
        city: name,
        temperature: Math.round(weatherData.main.temp),
        feelsLike: Math.round(weatherData.main.feels_like),
        humidity: weatherData.main.humidity,
        windSpeed: Math.round(weatherData.wind.speed * 3.6),
        description: weatherData.weather[0].description,
        icon: getWeatherEmoji(weatherData.weather[0].icon),
      };

      const dailyForecasts = new Map<string, ForecastDay>();
      for (const item of forecastData.list) {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        const existing = dailyForecasts.get(dateKey);

        if (!existing) {
          dailyForecasts.set(dateKey, {
            date: `${date.getMonth() + 1}/${date.getDate()}`,
            dayOfWeek: DAY_NAMES[date.getDay()],
            tempMax: Math.round(item.main.temp_max),
            tempMin: Math.round(item.main.temp_min),
            description: item.weather[0].description,
            icon: getWeatherEmoji(item.weather[0].icon),
            humidity: item.main.humidity,
          });
        } else {
          existing.tempMax = Math.max(existing.tempMax, Math.round(item.main.temp_max));
          existing.tempMin = Math.min(existing.tempMin, Math.round(item.main.temp_min));
        }
      }

      const forecast = Array.from(dailyForecasts.values()).slice(0, 7);

      const hourly: HourlyData[] = [];
      for (let i = 0; i < Math.min(12, forecastData.list.length); i += 1) {
        const item = forecastData.list[i];
        const dt = item.dt * 1000;
        const date = new Date(dt);
        hourly.push({
          time: `${date.getHours().toString().padStart(2, '0')}:00`,
          timestamp: dt,
          temperature: Math.round(item.main.temp),
          humidity: item.main.humidity,
        });
      }

      const aqiValue = aqiData.list[0].main.aqi * 50;
      const aqiInfo = getAqiInfo(aqiValue);
      const airQuality: AirQuality = {
        aqi: Math.round(aqiValue),
        level: aqiInfo.level,
        levelColor: aqiInfo.color,
        pm25: Math.round(aqiData.list[0].components.pm2_5),
        pm10: Math.round(aqiData.list[0].components.pm10),
      };

      return { current, forecast, hourly, airQuality };
    } catch (err) {
      throw normalizeApiError(err);
    }
  }

  async getWeatherData(city: string): Promise<WeatherData> {
    if (!API_KEY) {
      throw new Error('未配置 API Key，请在项目根目录创建 .env 文件并设置 VITE_OPENWEATHER_API_KEY=你的密钥');
    }
    try {
      return await this.fetchFromAPI(city);
    } catch (err) {
      throw normalizeApiError(err);
    }
  }
}

export const weatherService = new WeatherService();
