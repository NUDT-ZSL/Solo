import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import routePlannerRouter from './routes/routePlanner';
import logRecorderRouter from './routes/logRecorder';

const app = express();
const PORT = 5000;

const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(__dirname, 'upload');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'adventure.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS route_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routeId INTEGER NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    name TEXT,
    note TEXT,
    orderIndex INTEGER NOT NULL,
    FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routeId INTEGER,
    pointId INTEGER,
    content TEXT,
    weather TEXT,
    imagePath TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE SET NULL,
    FOREIGN KEY (pointId) REFERENCES route_points(id) ON DELETE SET NULL
  );
`);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.use('/api/routes', routePlannerRouter(db));
app.use('/api/logs', logRecorderRouter(db));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default db;
