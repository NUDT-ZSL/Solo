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
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const SCORES_PATH = path.join(DATA_DIR, 'scores.json');

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
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    res.json(config);
  } catch (err) {
    console.error('Error reading config:', err);
    res.status(500).json({ error: 'Failed to read config' });
  }
});

app.post('/api/save-score', (req, res) => {
  try {
    const body = req.body as SaveScoreRequest;
    const newScore: ScoreRecord = {
      ...body,
      id: uuidv4(),
    };

    let scores: ScoreRecord[] = [];
    try {
      scores = JSON.parse(fs.readFileSync(SCORES_PATH, 'utf-8'));
    } catch {
      scores = [];
    }

    scores.push(newScore);
    scores.sort((a, b) => b.maxMicrobeCount - a.maxMicrobeCount);

    fs.writeFileSync(SCORES_PATH, JSON.stringify(scores, null, 2), 'utf-8');

    const rank = scores.findIndex((s) => s.id === newScore.id) + 1;

    res.json({
      success: true,
      id: newScore.id,
      rank,
    });
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ error: 'Failed to save score', success: false });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
