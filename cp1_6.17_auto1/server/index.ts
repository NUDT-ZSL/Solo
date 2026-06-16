import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Character {
  id: string;
  name: string;
  type: 'vocal' | 'guitar' | 'drum' | 'bass';
  color: string;
  key: string;
  icon: string;
}

interface Song {
  id: string;
  name: string;
  bpm: number;
  duration: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

interface ScoreRecord {
  id: string;
  playerName: string;
  songId: string;
  songName: string;
  totalScore: number;
  rating: 'S' | 'A' | 'B' | 'C';
  accuracy: number;
  perfectCount: number;
  goodCount: number;
  okCount: number;
  missCount: number;
  createdAt: Date;
}

const characters: Character[] = [
  {
    id: 'vocal',
    name: '主唱',
    type: 'vocal',
    color: '#FF6B6B',
    key: 'A',
    icon: '🎤'
  },
  {
    id: 'guitar',
    name: '吉他手',
    type: 'guitar',
    color: '#4CAF50',
    key: 'S',
    icon: '🎸'
  },
  {
    id: 'drum',
    name: '鼓手',
    type: 'drum',
    color: '#FFD93D',
    key: 'D',
    icon: '🥁'
  },
  {
    id: 'bass',
    name: '贝斯手',
    type: 'bass',
    color: '#9B59B6',
    key: 'F',
    icon: '🎻'
  }
];

const songs: Song[] = [
  {
    id: 'song1',
    name: '夏日狂想曲',
    bpm: 120,
    duration: 60,
    difficulty: 'easy'
  },
  {
    id: 'song2',
    name: '星空漫步',
    bpm: 140,
    duration: 90,
    difficulty: 'normal'
  },
  {
    id: 'song3',
    name: '极限挑战',
    bpm: 180,
    duration: 120,
    difficulty: 'hard'
  }
];

let scores: ScoreRecord[] = [
  {
    id: '1',
    playerName: '音乐达人',
    songId: 'song1',
    songName: '夏日狂想曲',
    totalScore: 9850,
    rating: 'S',
    accuracy: 98.5,
    perfectCount: 85,
    goodCount: 10,
    okCount: 3,
    missCount: 2,
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    playerName: '节奏大师',
    songId: 'song2',
    songName: '星空漫步',
    totalScore: 12500,
    rating: 'A',
    accuracy: 89.2,
    perfectCount: 110,
    goodCount: 25,
    okCount: 8,
    missCount: 7,
    createdAt: new Date('2024-01-16')
  },
  {
    id: '3',
    playerName: '新手玩家',
    songId: 'song1',
    songName: '夏日狂想曲',
    totalScore: 6500,
    rating: 'B',
    accuracy: 72.1,
    perfectCount: 45,
    goodCount: 30,
    okCount: 15,
    missCount: 10,
    createdAt: new Date('2024-01-17')
  }
];

app.get('/api/characters', (req: Request, res: Response) => {
  res.json(characters);
});

app.get('/api/songs', (req: Request, res: Response) => {
  res.json(songs);
});

app.post('/api/score', (req: Request, res: Response) => {
  const scoreData: Omit<ScoreRecord, 'id' | 'createdAt'> = req.body;
  
  const newScore: ScoreRecord = {
    ...scoreData,
    id: Date.now().toString(),
    createdAt: new Date()
  };
  
  scores.push(newScore);
  scores.sort((a, b) => b.totalScore - a.totalScore);
  
  res.status(201).json({
    success: true,
    message: '成绩保存成功',
    score: newScore
  });
});

app.get('/api/scores', (req: Request, res: Response) => {
  const { songId } = req.query;
  
  let filteredScores = scores;
  if (songId) {
    filteredScores = scores.filter(s => s.songId === songId);
  }
  
  filteredScores.sort((a, b) => b.totalScore - a.totalScore);
  
  res.json(filteredScores.slice(0, 10));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
