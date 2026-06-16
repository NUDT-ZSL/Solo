import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let leaderboard = [
  { id: uuidv4(), name: '命运主宰', score: 2580, wave: 42, merges: 86, date: '2024-01-15' },
  { id: uuidv4(), name: '骰子大师', score: 2120, wave: 35, merges: 72, date: '2024-01-14' },
  { id: uuidv4(), name: '塔防王者', score: 1890, wave: 31, merges: 64, date: '2024-01-13' },
  { id: uuidv4(), name: '气运之子', score: 1650, wave: 28, merges: 55, date: '2024-01-12' },
  { id: uuidv4(), name: '守卫者', score: 1420, wave: 24, merges: 48, date: '2024-01-11' },
  { id: uuidv4(), name: '挑战者', score: 1280, wave: 22, merges: 42, date: '2024-01-10' },
  { id: uuidv4(), name: '新手玩家', score: 980, wave: 17, merges: 35, date: '2024-01-09' },
  { id: uuidv4(), name: '探索者', score: 760, wave: 14, merges: 28, date: '2024-01-08' },
  { id: uuidv4(), name: '初学者', score: 540, wave: 10, merges: 20, date: '2024-01-07' },
  { id: uuidv4(), name: '路人甲', score: 320, wave: 6, merges: 12, date: '2024-01-06' },
];

app.post('/api/score', (req, res) => {
  const { name, score, wave, merges } = req.body;

  if (!name || typeof score !== 'number' || typeof wave !== 'number' || typeof merges !== 'number') {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const newEntry = {
    id: uuidv4(),
    name: name || '匿名玩家',
    score,
    wave,
    merges,
    date: new Date().toISOString().split('T')[0],
  };

  leaderboard.push(newEntry);
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);

  res.json({ success: true, entry: newEntry, rank: leaderboard.findIndex(e => e.id === newEntry.id) + 1 });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(leaderboard);
});

app.get('/api/daily-challenge', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json({
    date: today,
    challenge: '今日挑战：只使用法师守卫通关',
    bonusMultiplier: 1.5,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
