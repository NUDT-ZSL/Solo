import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'gamedata.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return {
        seeds: parsed.seeds || [],
        records: parsed.records || [],
      };
    }
  } catch (e) {
    console.error('Error loading database:', e.message);
  }
  return { seeds: [], records: [] };
}

function saveDatabase(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving database:', e.message);
    return false;
  }
}

let gameDB = loadDatabase();
console.log(`Database loaded: ${gameDB.seeds.length} seeds, ${gameDB.records.length} records`);

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
  const now = new Date().toISOString();

  gameDB.seeds.push({
    id: gameDB.seeds.length + 1,
    seed,
    threat_level: safeThreatLevel,
    created_at: now,
  });
  saveDatabase(gameDB);

  const recentRecords = [...gameDB.records]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

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

  const now = new Date().toISOString();
  const newRecord = {
    id: gameDB.records.length + 1,
    seed,
    threat_level: threatLevel,
    time_spent: timeSpent || 0,
    remaining_hp: remainingHp ?? 0,
    max_hp: maxHp || 100,
    kill_count: killCount || 0,
    treasure_collected: treasureCollected || 0,
    cleared: cleared ? 1 : 0,
    created_at: now,
  };

  gameDB.records.push(newRecord);
  saveDatabase(gameDB);

  const response = buildStatsResponse(gameDB.records);
  res.json(response);
});

app.get('/api/stats', (req, res) => {
  const response = buildStatsResponse(gameDB.records);
  res.json(response);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    seeds: gameDB.seeds.length,
    records: gameDB.records.length,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Database file: ${DB_FILE}`);
});
