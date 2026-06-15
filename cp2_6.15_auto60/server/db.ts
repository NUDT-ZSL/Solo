import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.db');

const db = new sqlite3.Database(dbPath);

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

export function initDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        bpm INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        cover_url TEXT
      )`, (err) => {
        if (err) reject(err);
      });

      db.run(`CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        heart_rate INTEGER NOT NULL,
        cadence INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        calories REAL NOT NULL
      )`, (err) => {
        if (err) reject(err);
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp)`, (err) => {
        if (err) reject(err);
      });

      db.get('SELECT COUNT(*) as count FROM songs', (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (row.count === 0) {
          seedSongs();
        }
        resolve();
      });
    });
  });
}

function seedSongs() {
  const songs = [
    { title: 'Electric Dreams', artist: 'Pulse Runner', bpm: 85, duration: 210 },
    { title: 'Midnight Jog', artist: 'Night Stride', bpm: 95, duration: 195 },
    { title: 'Sunrise Pace', artist: 'Morning Beat', bpm: 100, duration: 220 },
    { title: 'Urban Rhythm', artist: 'City Walker', bpm: 105, duration: 205 },
    { title: 'Neon Step', artist: 'Flash Mob', bpm: 110, duration: 230 },
    { title: 'Speed Walker', artist: 'Quick Tempo', bpm: 115, duration: 215 },
    { title: 'Runner\'s High', artist: 'Endorphin', bpm: 120, duration: 240 },
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

  const stmt = db.prepare('INSERT INTO songs (id, title, artist, bpm, duration, cover_url) VALUES (?, ?, ?, ?, ?, ?)');
  
  songs.forEach((song) => {
    stmt.run(uuidv4(), song.title, song.artist, song.bpm, song.duration, null);
  });
  
  stmt.finalize();
}

export function getAllSongs(): Promise<Song[]> {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM songs ORDER BY bpm', (err, rows: Song[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function getSongById(id: string): Promise<Song | undefined> {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM songs WHERE id = ?', [id], (err, row: Song | undefined) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function addHistoryRecord(record: Omit<HistoryRecord>): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    db.run(
      'INSERT INTO history (id, heart_rate, cadence, timestamp, calories) VALUES (?, ?, ?, ?, ?)',
      [id, record.heart_rate, record.cadence, record.timestamp, record.calories],
      function(err) {
        if (err) reject(err);
        else resolve(id);
      }
    );
  });
}

export function getHistory(limit: number = 100): Promise<HistoryRecord[]> {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM history ORDER BY timestamp DESC LIMIT ?',
      [limit],
      (err, rows: HistoryRecord[]) => {
        if (err) reject(err);
        else resolve(rows.reverse());
      }
    );
  });
}

export default db;
