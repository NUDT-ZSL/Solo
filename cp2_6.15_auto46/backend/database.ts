import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const sqlite = sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'weather.db');

let db: sqlite3.Database | null = null;

function randomInRange(min: number, max: number, decimals: number = 1): number {
  const value = Math.random() * (max - min) + min;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

interface CityConfig {
  name: string;
  temp: [number, number];
  humidity: [number, number];
  windSpeed: [number, number];
}

const cities: CityConfig[] = [
  { name: '北京', temp: [22, 35], humidity: [40, 75], windSpeed: [5, 20] },
  { name: '上海', temp: [24, 32], humidity: [60, 90], windSpeed: [8, 25] },
  { name: '广州', temp: [26, 36], humidity: [70, 95], windSpeed: [3, 15] },
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
            insertStmt.run(city.name, date, temperature, humidity, windSpeed);
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
