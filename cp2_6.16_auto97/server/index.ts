import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const SCORES_PATH = path.join(DATA_DIR, 'scores.json');

const defaultConfig = {
  microbe: {
    initialCount: 50,
    minRadius: 6,
    maxRadius: 12,
    minSpeed: 40,
    maxSpeed: 80,
    minTurnFrequency: 1,
    maxTurnFrequency: 3,
    energyDecayRate: 0.5,
  },
  chemical: {
    maxAttractors: 5,
    maxRepellents: 5,
    radius: 80,
    duration: 8000,
    highConcentrationThreshold: 70,
    speedBoost: 1.5,
    speedBoostDuration: 2000,
  },
  collision: {
    bounceSpeedFactor: 0.6,
    flashDuration: 300,
    flashRadiusMultiplier: 1.5,
    fusionEnergyThreshold: 20,
    fusionEnergyFactor: 0.7,
    fusionRadiusBonus: 2,
  },
};

if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8');
}

if (!fs.existsSync(SCORES_PATH)) {
  fs.writeFileSync(SCORES_PATH, JSON.stringify([], null, 2), 'utf-8');
}

interface SaveScoreRequest {
  playerName: string;
  maxMicrobeCount: number;
  avgEnergy: number;
  duration: number;
  timestamp: number;
}

interface ScoreRecord extends SaveScoreRequest {
  id: string;
}

app.get('/api/config', (_req, res) => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      res.json(defaultConfig);
      return;
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    console.log('[API] Config loaded successfully');
    res.json(config);
  } catch (err) {
    console.error('Error reading config:', err);
    res.status(500).json({ error: 'Failed to read config', ...defaultConfig });
  }
});

app.post('/api/save-score', (req, res) => {
  try {
    const body = req.body as SaveScoreRequest;
    console.log('[API] Saving score:', body);

    const newScore: ScoreRecord = {
      ...body,
      id: uuidv4(),
    };

    let scores: ScoreRecord[] = [];
    try {
      if (fs.existsSync(SCORES_PATH)) {
        const raw = fs.readFileSync(SCORES_PATH, 'utf-8');
        scores = JSON.parse(raw) as ScoreRecord[];
      }
    } catch (e) {
      console.warn('Could not read scores, starting fresh:', e);
      scores = [];
    }

    scores.push(newScore);
    scores.sort((a, b) => b.maxMicrobeCount - a.maxMicrobeCount);

    fs.writeFileSync(SCORES_PATH, JSON.stringify(scores, null, 2), 'utf-8');

    const rank = scores.findIndex((s) => s.id === newScore.id) + 1;

    console.log('[API] Score saved, rank:', rank);

    res.json({
      success: true,
      id: newScore.id,
      rank,
    });
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ error: 'Failed to save score', success: false, id: '', rank: -1 });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
