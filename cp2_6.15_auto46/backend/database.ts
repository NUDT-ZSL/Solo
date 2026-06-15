import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const sqlite = sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'weather.db');

let db: sqlite3.Database | null = null;

export const VALID_CITIES = ['beijing', 'shanghai', 'guangzhou', 'all'] as const;
export type CityCode = typeof VALID_CITIES[number];

export const CITY_NAME_MAP: Record<string, string> = {
  beijing: '北京',
  shanghai: '上海',
  guangzhou: '广州',
};

export interface WeatherData {
  city: string;
  date: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
}

function randomInRange(min: number, max: number, decimals: number = 1): number {
  const value = Math.random() * (max - min) + min;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

interface CityConfig {
  code: string;
  name: string;
  temp: [number, number];
  humidity: [number, number];
  windSpeed: [number, number];
}

const cities: CityConfig[] = [
  { code: 'beijing', name: '北京', temp: [22, 35], humidity: [40, 75], windSpeed: [5, 20] },
  { code: 'shanghai', name: '上海', temp: [24, 32], humidity: [60, 90], windSpeed: [8, 25] },
  { code: 'guangzhou', name: '广州', temp: [26, 36], humidity: [70, 95], windSpeed: [3, 15] },
];

function generateDateRange(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < days; i++) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db = new sqlite.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db!.serialize(() => {
        db!.run(`
          CREATE TABLE IF NOT EXISTS weather (
            id INTEGER PRIMARY KEY,
            city TEXT NOT NULL,
            date TEXT NOT NULL,
            temperature REAL NOT NULL,
            humidity REAL NOT NULL,
            windSpeed REAL NOT NULL,
            UNIQUE(city, date)
          )
        `);

        db!.run('CREATE INDEX IF NOT EXISTS idx_weather_city ON weather(city)');
        db!.run('CREATE INDEX IF NOT EXISTS idx_weather_date ON weather(date)');

        const dates = generateDateRange('2026-06-08', 7);
        const insertStmt = db!.prepare(
          'INSERT OR IGNORE INTO weather (city, date, temperature, humidity, windSpeed) VALUES (?, ?, ?, ?, ?)'
        );

        for (const city of cities) {
          for (const date of dates) {
            const temperature = randomInRange(city.temp[0], city.temp[1]);
            const humidity = randomInRange(city.humidity[0], city.humidity[1]);
            const windSpeed = randomInRange(city.windSpeed[0], city.windSpeed[1]);
            insertStmt.run(city.code, date, temperature, humidity, windSpeed);
          }
        }

        insertStmt.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  });
}

export function getDb(): sqlite3.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function getWeatherData(city: string, days: number): Promise<WeatherData[]> {
  return new Promise((resolve, reject) => {
    if (city === null || city === undefined || city.trim() === '') {
      reject(new Error('城市参数不能为空'));
      return;
    }

    if (typeof city !== 'string') {
      reject(new Error('城市参数必须是字符串类型'));
      return;
    }

    if (!VALID_CITIES.includes(city as CityCode)) {
      reject(new Error(`不支持的城市: ${city}，可选值: ${VALID_CITIES.join(', ')}`));
      return;
    }

    if (typeof days !== 'number' || isNaN(days)) {
      reject(new Error('天数参数必须是有效数字'));
      return;
    }

    if (days < 1 || days > 365) {
      reject(new Error(`天数参数必须在 1-365 之间，当前值: ${days}`));
      return;
    }

    const database = getDb();
    const query = city === 'all'
      ? `SELECT city, date, temperature, humidity, windSpeed FROM weather ORDER BY date DESC LIMIT ?`
      : `SELECT city, date, temperature, humidity, windSpeed FROM weather WHERE city = ? ORDER BY date DESC LIMIT ?`;
    const params = city === 'all' ? [days] : [city, days];

    database.all(query, params, (err: Error | null, rows: any[]) => {
      if (err) {
        reject(new Error(`数据库查询失败: ${err.message}`));
        return;
      }

      const data: WeatherData[] = rows.map(row => ({
        city: row.city,
        date: row.date,
        temperature: row.temperature,
        humidity: row.humidity,
        windSpeed: row.windSpeed,
      }));

      resolve(data);
    });
  });
}

export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        db = null;
        resolve();
      }
    });
  });
}
