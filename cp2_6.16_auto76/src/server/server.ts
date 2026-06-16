import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { GameStats } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

const dataDir = path.join(__dirname, '../../data');
const scoresFile = path.join(dataDir, 'scores.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(scoresFile)) {
  fs.writeFileSync(scoresFile, '[]', 'utf-8');
}

app.use(cors());
app.use(express.json());

const readScores = (): GameStats[] => {
  try {
    const data = fs.readFileSync(scoresFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeScores = (scores: GameStats[]): void => {
  fs.writeFileSync(scoresFile, JSON.stringify(scores, null, 2), 'utf-8');
};

app.post('/api/saveScore', (req, res) => {
  try {
    const { playerName, steps, kills, chestsOpened, victory } = req.body;

    if (!playerName || typeof steps !== 'number' || typeof kills !== 'number' ||
        typeof chestsOpened !== 'number' || typeof victory !== 'boolean') {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const newScore: GameStats = {
      playerName,
      steps,
      kills,
      chestsOpened,
      victory,
      timestamp: Date.now()
    };

    const scores = readScores();
    scores.push(newScore);
    scores.sort((a, b) => {
      if (a.victory !== b.victory) return a.victory ? -1 : 1;
      if (a.kills !== b.kills) return b.kills - a.kills;
      return b.chestsOpened - a.chestsOpened;
    });

    writeScores(scores.slice(0, 50));

    res.status(201).json({ success: true, score: newScore });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leaderboard', (_req, res) => {
  try {
    const scores = readScores();
    res.json({ scores: scores.slice(0, 20) });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Data directory: ${dataDir}`);
});
