import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = join(DATA_DIR, 'game.db');
const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  const createSeedsTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS seeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed TEXT UNIQUE NOT NULL,
      threat_level INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  createSeedsTable.run();

  const createRecordsTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS game_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seed TEXT NOT NULL,
      threat_level INTEGER NOT NULL,
      time_spent REAL NOT NULL,
      remaining_hp INTEGER NOT NULL,
      max_hp INTEGER NOT NULL,
      kill_count INTEGER NOT NULL,
      treasure_collected INTEGER NOT NULL,
      cleared INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seed) REFERENCES seeds(seed)
    )
  `);
  createRecordsTable.run();

  const createRecordsIndex = db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_records_created_at ON game_records(created_at DESC)
  `);
  createRecordsIndex.run();

  console.log('Database tables initialized');
}

initDatabase();

const insertSeedStmt = db.prepare(
  'INSERT INTO seeds (seed, threat_level) VALUES (?, ?)',
);

const getRecentRecordsStmt = db.prepare(
  'SELECT * FROM game_records ORDER BY created_at DESC LIMIT ?',
);

const getAllRecordsStmt = db.prepare(
  'SELECT * FROM game_records ORDER BY created_at DESC',
);

const insertRecordStmt = db.prepare(`
  INSERT INTO game_records
    (seed, threat_level, time_spent, remaining_hp, max_hp, kill_count, treasure_collected, cleared)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

function generateSeed() {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

function calculateDifficultyConfig(threatLevel, records) {
  const recent = records || [];
  const sortedRecent = [...recent]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  let monsterDensityMultiplier = 1.0;
  let trapDensityMultiplier = 1.0;
  let treasureDropRate = 1.0;
  let monsterAIStrength = 1.0;

  const consecutiveClears = [];
  for (const r of sortedRecent) {
    if (r.cleared) {
      consecutiveClears.push(r);
    } else {
      break;
    }
  }

  const consecutiveFails = [];
  for (const r of sortedRecent) {
    if (!r.cleared) {
      consecutiveFails.push(r);
    } else {
      break;
    }
  }

  if (consecutiveClears.length >= 3) {
    const avgHpRatio =
      consecutiveClears.reduce(
        (sum, r) => sum + r.remaining_hp / r.max_hp,
        0,
      ) / consecutiveClears.length;
    if (avgHpRatio > 0.8) {
      monsterAIStrength = 1.2;
    }
  }

  if (consecutiveFails.length >= 2) {
    monsterDensityMultiplier = 0.7;
  }

  const levelFactor = threatLevel / 5;
  treasureDropRate = 0.8 + levelFactor * 0.4;
  trapDensityMultiplier = 0.5 + levelFactor * 1.0;

  return {
    monsterDensityMultiplier,
    trapDensityMultiplier,
    treasureDropRate,
    monsterAIStrength,
  };
}

function analyzeDifficultyHint(records) {
  if (!records || records.length < 2) {
    return { adjust: 0, hint: '' };
  }

  const sorted = [...records].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  const recent = sorted.slice(0, 5);

  const consecutiveClears = [];
  for (const r of recent) {
    if (r.cleared) {
      consecutiveClears.push(r);
    } else {
      break;
    }
  }

  const consecutiveFails = [];
  for (const r of recent) {
    if (!r.cleared) {
      consecutiveFails.push(r);
    } else {
      break;
    }
  }

  if (consecutiveClears.length >= 3) {
    const avgHpRatio =
      consecutiveClears.reduce(
        (sum, r) => sum + r.remaining_hp / r.max_hp,
        0,
      ) / consecutiveClears.length;
    if (avgHpRatio > 0.8) {
      return { adjust: 1, hint: '表现出色！难度自动提升' };
    }
  }

  if (consecutiveFails.length >= 2) {
    return { adjust: 0, hint: '难度降低：怪物密度减少30%' };
  }

  return { adjust: 0, hint: '' };
}

function buildStatsResponse(allRecords) {
  const totalClears = allRecords.filter((r) => r.cleared).length;
  const totalTreasures = allRecords.reduce(
    (sum, r) => sum + (r.treasure_collected || 0),
    0,
  );

  const sorted = [...allRecords].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  const recentRecords = sorted.slice(0, 5).map((r) => ({
    id: r.id,
    seed: r.seed,
    threatLevel: r.threat_level,
    timeSpent: r.time_spent,
    remainingHp: r.remaining_hp,
    maxHp: r.max_hp,
    killCount: r.kill_count,
    treasureCollected: r.treasure_collected,
    cleared: !!r.cleared,
    createdAt: r.created_at,
  }));

  const { adjust, hint } = analyzeDifficultyHint(allRecords);

  return {
    totalClears,
    totalTreasures,
    recentRecords,
    autoLevelAdjust: adjust,
    difficultyHint: hint,
  };
}

app.get('/api/seed', (req, res) => {
  const threatLevel = parseInt(req.query.threatLevel) || 5;
  const safeThreatLevel = Math.max(1, Math.min(10, threatLevel));

  const seed = generateSeed();

  const insertTx = db.transaction(() => {
    insertSeedStmt.run(seed, safeThreatLevel);
  });
  insertTx();

  const recentRecords = getRecentRecordsStmt.all(5);
  const config = calculateDifficultyConfig(safeThreatLevel, recentRecords);

  res.json({ seed, config });
});

app.post('/api/record', (req, res) => {
  const {
    seed,
    threatLevel,
    timeSpent,
    remainingHp,
    maxHp,
    killCount,
    treasureCollected,
    cleared,
  } = req.body;

  if (!seed || threatLevel == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const insertTx = db.transaction(() => {
    insertRecordStmt.run(
      seed,
      threatLevel,
      timeSpent || 0,
      remainingHp ?? 0,
      maxHp || 100,
      killCount || 0,
      treasureCollected || 0,
      cleared ? 1 : 0,
    );
  });
  insertTx();

  const allRecords = getAllRecordsStmt.all();
  const response = buildStatsResponse(allRecords);

  res.json(response);
});

app.get('/api/stats', (req, res) => {
  const allRecords = getAllRecordsStmt.all();
  const response = buildStatsResponse(allRecords);
  res.json(response);
});

app.get('/api/health', (req, res) => {
  const seedCount = db.prepare('SELECT COUNT(*) as count FROM seeds').get();
  const recordCount = db.prepare('SELECT COUNT(*) as count FROM game_records').get();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    seeds: seedCount.count,
    records: recordCount.count,
  });
});

process.on('SIGINT', () => {
  console.log('\nClosing database connection...');
  db.close();
  console.log('Database connection closed');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Database file: ${DB_FILE}`);
});
