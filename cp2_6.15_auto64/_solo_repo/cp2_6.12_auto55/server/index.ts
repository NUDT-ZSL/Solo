import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

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

const cities: City[] = [
  { id: 'beijing', name: '北京', lat: 39.9042, lon: 116.4074, elevation: 43.5 },
  { id: 'shanghai', name: '上海', lat: 31.2304, lon: 121.4737, elevation: 4.5 },
  { id: 'guangzhou', name: '广州', lat: 23.1291, lon: 113.2644, elevation: 11 },
  { id: 'chengdu', name: '成都', lat: 30.5728, lon: 104.0668, elevation: 500 },
  { id: 'xian', name: '西安', lat: 34.3416, lon: 108.9398, elevation: 397 },
  { id: 'kunming', name: '昆明', lat: 25.0389, lon: 102.7183, elevation: 1891 },
];

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return function() {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const corners = (noise2D(x - 1, y - 1, seed) + noise2D(x + 1, y - 1, seed) +
                   noise2D(x - 1, y + 1, seed) + noise2D(x + 1, y + 1, seed)) / 16;
  const sides = (noise2D(x - 1, y, seed) + noise2D(x + 1, y, seed) +
                 noise2D(x, y - 1, seed) + noise2D(x, y + 1, seed)) / 8;
  const center = noise2D(x, y, seed) / 4;
  return corners + sides + center;
}

function interpolatedNoise(x: number, y: number, seed: number): number {
  const intX = Math.floor(x);
  const fracX = x - intX;
  const intY = Math.floor(y);
  const fracY = y - intY;

  const v1 = smoothNoise(intX, intY, seed);
  const v2 = smoothNoise(intX + 1, intY, seed);
  const v3 = smoothNoise(intX, intY + 1, seed);
  const v4 = smoothNoise(intX + 1, intY + 1, seed);

  const i1 = v1 * (1 - fracX) + v2 * fracX;
  const i2 = v3 * (1 - fracX) + v4 * fracX;

  return i1 * (1 - fracY) + i2 * fracY;
}

function perlinNoise(x: number, y: number, seed: number, octaves: number = 4): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += interpolatedNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / maxValue;
}

function generateWeatherData(cityId: string, timeStr: string): WeatherData {
  const city = cities.find(c => c.id === cityId) || cities[0];
  const seedStr = `${cityId}-${timeStr}`;
  const rand = seededRandom(seedStr);
  const seed = rand() * 10000;

  const gridSize = 10;
  const points: WeatherPoint[] = [];

  const baseTemp = city.elevation > 1000 ? 15 : (city.lat > 35 ? 12 : 22);
  const seasonFactor = Math.sin((new Date(timeStr).getMonth() / 12) * Math.PI * 2 - Math.PI / 2) * 15;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = (i / (gridSize - 1) - 0.5) * 160;
      const y = (j / (gridSize - 1) - 0.5) * 160;

      const noiseVal = perlinNoise(i * 0.3, j * 0.3, seed, 3);
      const temperature = baseTemp + seasonFactor + (noiseVal - 0.5) * 20;

      const windNoise = perlinNoise(i * 0.2 + 100, j * 0.2 + 100, seed, 2);
      const windSpeed = windNoise * 25 + 2;

      const dirNoise = perlinNoise(i * 0.15 + 200, j * 0.15 + 200, seed, 2);
      const windDirection = dirNoise * 360;

      const precipNoise = perlinNoise(i * 0.25 + 300, j * 0.25 + 300, seed, 3);
      const precipitation = Math.max(0, (precipNoise - 0.3) * 150);

      points.push({
        x,
        y,
        temperature: Math.max(-10, Math.min(45, temperature)),
        windSpeed: Math.max(0, Math.min(30, windSpeed)),
        windDirection: windDirection % 360,
        precipitation: Math.max(0, Math.min(100, precipitation)),
      });
    }
  }

  return {
    cityId,
    time: timeStr,
    points,
  };
}

app.get('/api/cities', (req, res) => {
  res.json(cities);
});

app.get('/api/weather', (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city : 'beijing';
  let time = typeof req.query.time === 'string' ? req.query.time : new Date().toISOString();

  if (!time.includes('T')) {
    const date = new Date(time);
    if (isNaN(date.getTime())) {
      time = new Date().toISOString();
    } else {
      time = date.toISOString();
    }
  }

  const weatherData = generateWeatherData(city, time);
  res.json(weatherData);
});

app.get('/api/weather/batch', (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city : 'beijing';
  const startTime = typeof req.query.startTime === 'string' ? req.query.startTime : new Date().toISOString();
  const count = parseInt(typeof req.query.count === 'string' ? req.query.count : '3');
  const intervalHours = parseInt(typeof req.query.interval === 'string' ? req.query.interval : '3');

  const dataList: WeatherData[] = [];
  const baseDate = new Date(startTime);

  for (let i = 0; i < count; i++) {
    const time = new Date(baseDate.getTime() + i * intervalHours * 60 * 60 * 1000);
    dataList.push(generateWeatherData(city, time.toISOString()));
  }

  res.json(dataList);
});

app.listen(PORT, () => {
  console.log(`Weather API server running on http://localhost:${PORT}`);
  console.log(`GET /api/cities - 获取城市列表`);
  console.log(`GET /api/weather?city=xxx&time=xxx - 获取指定城市指定时间的气象数据`);
});
