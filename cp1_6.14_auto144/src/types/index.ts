export interface CurrentWeather {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

export interface ForecastDay {
  date: string;
  dayOfWeek: string;
  tempMax: number;
  tempMin: number;
  description: string;
  icon: string;
  humidity: number;
}

export interface HourlyData {
  time: string;
  temperature: number;
  humidity: number;
}

export interface AirQuality {
  aqi: number;
  level: string;
  levelColor: string;
  pm25: number;
  pm10: number;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: ForecastDay[];
  hourly: HourlyData[];
  airQuality: AirQuality;
}

export type AqiLevel = '优' | '良' | '轻度污染' | '中度污染' | '重度污染' | '严重污染';
