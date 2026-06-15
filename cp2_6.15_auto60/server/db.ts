import initSqlJs, { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.db');

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  cover_url: string | null;
}

export interface HistoryRecord {
  id: string;
  heart_rate: number;
  cadence: number;
  timestamp: number;
  calories: number;
}

let db: Database;

function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  } catch {}
}

export async function initDB(): Promise<void> {
  const SQL = await initSqlJs();

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    bpm INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    cover_url TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    heart_rate INTEGER NOT NULL,
    cadence INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    calories REAL NOT NULL
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp)`);

  const countResult = db.exec('SELECT COUNT(*) as count FROM songs');
  const count = countResult[0]?.values[0]?.[0] as number ?? 0;

  if (count === 0) {
    seedSongs();
  }

  saveDb();
}

function seedSongs() {
  const songs = [
    { title: 'Electric Dreams', artist: 'Pulse Runner', bpm: 85, duration: 210 },
    { title: 'Midnight Jog', artist: 'Night Stride', bpm: 95, duration: 195 },
    { title: 'Sunrise Pace', artist: 'Morning Beat', bpm: 100, duration: 220 },
    { title: 'Urban Rhythm', artist: 'City Walker', bpm: 105, duration: 205 },
    { title: 'Neon Step', artist: 'Flash Mob', bpm: 110, duration: 230 },
    { title: 'Speed Walker', artist: 'Quick Tempo', bpm: 115, duration: 215 },
    { title: "Runner's High", artist: 'Endorphin', bpm: 120, duration: 240 },
    { title: 'Cardio Blast', artist: 'Heart Pump', bpm: 125, duration: 225 },
    { title: 'Sprint Beat', artist: 'Dash Music', bpm: 130, duration: 200 },
    { title: 'Velocity', artist: 'Fast Forward', bpm: 135, duration: 235 },
    { title: 'Momentum', artist: 'Kinetic', bpm: 140, duration: 218 },
    { title: 'Thunder Run', artist: 'Storm Chaser', bpm: 145, duration: 245 },
    { title: 'Adrenaline', artist: 'Rush Hour', bpm: 150, duration: 228 },
    { title: 'Power Surge', artist: 'Energy Spike', bpm: 155, duration: 212 },
    { title: 'Turbo Charge', artist: 'Nitro Beat', bpm: 160, duration: 250 },
    { title: 'Speed Demon', artist: 'Velocity X', bpm: 165, duration: 232 },
    { title: 'Maximum Velocity', artist: 'Peak Performance', bpm: 170, duration: 242 },
    { title: 'Sprint Finale', artist: 'Finish Line', bpm: 175, duration: 215 },
    { title: 'Ultra Pace', artist: 'Hyper Drive', bpm: 158, duration: 222 },
    { title: 'Recovery Walk', artist: 'Cool Down', bpm: 75, duration: 260 }
  ];

  for (const song of songs) {
    db.run(
      'INSERT INTO songs (id, title, artist, bpm, duration, cover_url) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), song.title, song.artist, song.bpm, song.duration, null]
    );
  }
}

export function getAllSongs(): Song[] {
  const result = db.exec('SELECT id, title, artist, bpm, duration, cover_url FROM songs ORDER BY bpm');
  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    id: row[0] as string,
    title: row[1] as string,
    artist: row[2] as string,
    bpm: row[3] as number,
    duration: row[4] as number,
    cover_url: row[5] as string | null
  }));
}

export function getSongById(id: string): Song | undefined {
  const result = db.exec('SELECT id, title, artist, bpm, duration, cover_url FROM songs WHERE id = ?', [id]);
  if (!result[0]?.values[0]) return undefined;
  const row = result[0].values[0];
  return {
    id: row[0] as string,
    title: row[1] as string,
    artist: row[2] as string,
    bpm: row[3] as number,
    duration: row[4] as number,
    cover_url: row[5] as string | null
  };
}

export function addHistoryRecord(record: Omit<HistoryRecord, 'id'>): string {
  const id = uuidv4();
  db.run(
    'INSERT INTO history (id, heart_rate, cadence, timestamp, calories) VALUES (?, ?, ?, ?, ?)',
    [id, record.heart_rate, record.cadence, record.timestamp, record.calories]
  );
  saveDb();
  return id;
}

export function getHistory(limit: number = 100): HistoryRecord[] {
  const result = db.exec(
    'SELECT id, heart_rate, cadence, timestamp, calories FROM history ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
  if (!result[0]) return [];
  const rows = result[0].values.map((row) => ({
    id: row[0] as string,
    heart_rate: row[1] as number,
    cadence: row[2] as number,
    timestamp: row[3] as number,
    calories: row[4] as number
  }));
  return rows.reverse();
}
