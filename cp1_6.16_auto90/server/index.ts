import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

interface Character {
  id: string;
  name: string;
  role: string;
  color: string;
  key: string;
  icon: string;
}

interface Song {
  id: string;
  name: string;
  bpm: number;
  duration: number;
  difficulty: string;
}

interface ScoreEntry {
  id: string;
  playerName: string;
  songId: string;
  songName: string;
  totalScore: number;
  grade: string;
  hitRate: number;
  timestamp: number;
}

const characters: Character[] = [
  { id: 'vocalist', name: '主唱', role: 'vocalist', color: '#FF6B6B', key: 'A', icon: '🎤' },
  { id: 'guitarist', name: '吉他手', role: 'guitarist', color: '#4CAF50', key: 'S', icon: '🎸' },
  { id: 'drummer', name: '鼓手', role: 'drummer', color: '#FFD93D', key: 'D', icon: '🥁' },
  { id: 'bassist', name: '贝斯手', role: 'bassist', color: '#9B59B6', key: 'F', icon: '🎻' }
];

const songs: Song[] = [
  { id: 'song1', name: '星空交响曲', bpm: 120, duration: 30000, difficulty: '简单' },
  { id: 'song2', name: '电子狂想曲', bpm: 140, duration: 35000, difficulty: '中等' },
  { id: 'song3', name: '终极挑战', bpm: 180, duration: 40000, difficulty: '困难' }
];

let scores: ScoreEntry[] = [
  { id: '1', playerName: '音乐大师', songId: 'song1', songName: '星空交响曲', totalScore: 9500, grade: 'S', hitRate: 96, timestamp: Date.now() - 86400000 },
  { id: '2', playerName: '节奏王者', songId: 'song2', songName: '电子狂想曲', totalScore: 8200, grade: 'A', hitRate: 88, timestamp: Date.now() - 43200000 },
  { id: '3', playerName: '鼓手小明', songId: 'song1', songName: '星空交响曲', totalScore: 7100, grade: 'B', hitRate: 75, timestamp: Date.now() - 21600000 }
];

app.get('/api/characters', (req, res) => {
  res.json(characters);
});

app.get('/api/songs', (req, res) => {
  res.json(songs);
});

app.post('/api/score', (req, res) => {
  const { playerName, songId, songName, totalScore, grade, hitRate } = req.body;
  
  if (!playerName || !songId || totalScore === undefined) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const newScore: ScoreEntry = {
    id: Date.now().toString(),
    playerName,
    songId,
    songName,
    totalScore,
    grade,
    hitRate,
    timestamp: Date.now()
  };

  scores.push(newScore);
  scores.sort((a, b) => b.totalScore - a.totalScore);
  
  res.json({ success: true, score: newScore });
});

app.get('/api/scores', (req, res) => {
  const sortedScores = [...scores].sort((a, b) => b.totalScore - a.totalScore);
  res.json(sortedScores);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
