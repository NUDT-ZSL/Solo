import type { WeatherData, DailyWeather, WeatherType } from '../types';

export const CITIES = ['北京', '上海', '广州', '深圳', '杭州'];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateDailyWeather(dateStr: string, seed: number): DailyWeather {
  const temp = Math.round((seededRandom(seed) * 40 - 5) * 10) / 10;
  const tempHigh = Math.round((temp + seededRandom(seed + 1) * 5 + 2) * 10) / 10;
  const tempLow = Math.round((temp - seededRandom(seed + 2) * 5 - 2) * 10) / 10;
  const humidity = Math.round(seededRandom(seed + 3) * 65 + 30);
  const windSpeed = Math.round((seededRandom(seed + 4) * 30) * 10) / 10;
  const rainProb = Math.round(seededRandom(seed + 5) * 100);

  let type: WeatherType;
  if (rainProb > 50) {
    type = 'rainy';
  } else if (seededRandom(seed + 6) > 0.5) {
    type = 'cloudy';
  } else {
    type = 'sunny';
  }

  const iconMap: Record<WeatherType, string> = {
    sunny: '☀️',
    cloudy: '⛅',
    rainy: '🌧️'
  };

  return {
    date: dateStr,
    temp,
    tempHigh,
    tempLow,
    humidity,
    windSpeed,
    rainProb,
    type,
    icon: iconMap[type]
  };
}

export function getWeather(city: string): Promise<WeatherData> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const baseSeed = city.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const today = new Date();
      const forecast: DailyWeather[] = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const seed = baseSeed + i * 1000;
        forecast.push(generateDailyWeather(dateStr, seed));
      }

      resolve({
        city,
        current: forecast[0],
        forecast
      });
    }, 100);
  });
}
