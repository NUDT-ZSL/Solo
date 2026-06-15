export type CityName = 'beijing' | 'shanghai' | 'guangzhou';

export type MetricType = 'temperature' | 'humidity' | 'windSpeed';

export interface WeatherData {
  city: CityName;
  date: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
}

export const CITIES: Record<CityName, string> = {
  beijing: '北京',
  shanghai: '上海',
  guangzhou: '广州',
};

export const METRIC_CONFIG: Record<MetricType, { name: string; colors: [string, string]; unit: string }> = {
  temperature: { name: '气温', colors: ['#ff6b35', '#ffd700'], unit: '°C' },
  humidity: { name: '湿度', colors: ['#0288d1', '#4caf50'], unit: '%' },
  windSpeed: { name: '风速', colors: ['#7e57c2', '#42a5f5'], unit: 'm/s' },
};

interface CityDataRange {
  temperature: [number, number];
  humidity: [number, number];
  windSpeed: [number, number];
}

const CITY_RANGES: Record<CityName, CityDataRange> = {
  beijing: {
    temperature: [22, 35],
    humidity: [40, 75],
    windSpeed: [5, 20],
  },
  shanghai: {
    temperature: [24, 32],
    humidity: [60, 90],
    windSpeed: [8, 25],
  },
  guangzhou: {
    temperature: [26, 36],
    humidity: [70, 95],
    windSpeed: [3, 15],
  },
};

function randomInRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function getMetricColor(metric: MetricType, value: number): string {
  const config = METRIC_CONFIG[metric];
  const [color1, color2] = config.colors;
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const t = Math.max(0, Math.min(1, value));
  
  const r = rgb1.r + (rgb2.r - rgb1.r) * t;
  const g = rgb1.g + (rgb2.g - rgb1.g) * t;
  const b = rgb1.b + (rgb2.b - rgb1.b) * t;
  
  return rgbToHex(r, g, b);
}

export function generateMockData(city: CityName, days: number = 7): WeatherData[] {
  const range = CITY_RANGES[city];
  const data: WeatherData[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    data.push({
      city,
      date: formatDate(date),
      temperature: randomInRange(range.temperature[0], range.temperature[1]),
      humidity: randomInRange(range.humidity[0], range.humidity[1]),
      windSpeed: randomInRange(range.windSpeed[0], range.windSpeed[1]),
    });
  }
  
  return data;
}
