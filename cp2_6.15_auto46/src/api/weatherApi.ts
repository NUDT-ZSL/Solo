import type { WeatherData, CityName } from '@/data/mockData';

export async function fetchWeatherData(city: CityName, days: number = 7): Promise<WeatherData[]> {
  const response = await fetch(`/api/weather/${city}?days=${days}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch weather data: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.data || !Array.isArray(result.data)) {
    throw new Error('Invalid weather data format');
  }

  return result.data;
}

export type { WeatherData, CityName };
