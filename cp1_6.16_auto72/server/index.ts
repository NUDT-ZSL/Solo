import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface SaveRecord {
  id: string;
  playerName: string;
  steps: number;
  level: number;
  timestamp: number;
}

interface LeaderboardEntry {
  rank: number;
  playerName: string;
  steps: number;
  level: number;
  timestamp: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const saveRecords: SaveRecord[] = [];

app.post('/api/save-slot', (req, res) => {
  const { playerName, steps, level } = req.body;

  if (!playerName || typeof steps !== 'number' || typeof level !== 'number') {
    res.status(400).json({ success: false, message: '参数不完整' });
    return;
  }

  const record: SaveRecord = {
    id: uuidv4(),
    playerName: String(playerName).slice(0, 20),
    steps: Math.max(0, Math.floor(steps)),
    level: Math.max(1, Math.floor(level)),
    timestamp: Date.now(),
  };

  saveRecords.push(record);

  res.json({ success: true, message: '存档成功' });
});

app.get('/api/leaderboard', (_req, res) => {
  const sorted = [...saveRecords].sort((a, b) => a.steps - b.steps);
  const top10: LeaderboardEntry[] = sorted.slice(0, 10).map((r, i) => ({
    rank: i + 1,
    playerName: r.playerName,
    steps: r.steps,
    level: r.level,
    timestamp: r.timestamp,
  }));

  res.json({ data: top10 });
});

app.listen(PORT, () => {
  console.log(`暗影地牢后端服务运行于 http://localhost:${PORT}`);
});
