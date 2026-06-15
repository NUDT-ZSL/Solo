import type { WeatherType } from '../types';
import { weatherMap } from '../types';

export { weatherMap };
export type { WeatherType };

export const getWeather = async (
  lat: number,
  lng: number,
  time: Date = new Date()
): Promise<WeatherType> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const weatherTypes: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
      const seed = Math.floor(Math.abs(lat * 1000 + lng * 1000 + time.getDate())) % weatherTypes.length;
      resolve(weatherTypes[seed]);
    }, 200);
  });
};
