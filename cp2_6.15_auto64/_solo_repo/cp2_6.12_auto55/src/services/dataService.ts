export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
}

export interface WeatherPoint {
  x: number;
  y: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
}

export interface WeatherData {
  cityId: string;
  time: string;
  points: WeatherPoint[];
}

const BASE_URL = '/api';

export async function fetchCities(): Promise<City[]> {
  const response = await fetch(`${BASE_URL}/cities`);
  if (!response.ok) {
    throw new Error('Failed to fetch cities');
  }
  return response.json();
}

export async function fetchWeather(city: string, time: string): Promise<WeatherData> {
  const response = await fetch(`${BASE_URL}/weather?city=${encodeURIComponent(city)}&time=${encodeURIComponent(time)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  return response.json();
}

export async function fetchWeatherBatch(
  city: string,
  startTime: string,
  count: number = 3,
  intervalHours: number = 3
): Promise<WeatherData[]> {
  const response = await fetch(
    `${BASE_URL}/weather/batch?city=${encodeURIComponent(city)}&startTime=${encodeURIComponent(startTime)}&count=${count}&interval=${intervalHours}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch weather batch data');
  }
  return response.json();
}

export function lerpWeatherData(from: WeatherData, to: WeatherData, t: number): WeatherPoint[] {
  if (from.points.length !== to.points.length) {
    return to.points;
  }

  return from.points.map((point, index) => {
    const toPoint = to.points[index];
    return {
      x: point.x,
      y: point.y,
      temperature: point.temperature + (toPoint.temperature - point.temperature) * t,
      windSpeed: point.windSpeed + (toPoint.windSpeed - point.windSpeed) * t,
      windDirection: point.windDirection + (toPoint.windDirection - point.windDirection) * t,
      precipitation: point.precipitation + (toPoint.precipitation - point.precipitation) * t,
    };
  });
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
