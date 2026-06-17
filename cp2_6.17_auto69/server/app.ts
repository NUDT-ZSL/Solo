import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSONFile<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function writeJSONFile(filename: string, data: unknown): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

interface PlayerInSession {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface StrategyNote {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  round: number;
  content: string;
  likes: number;
  likedBy: string[];
  timestamp: string;
}

interface PlayerResult {
  playerId: string;
  playerName: string;
  rank: number;
  score: number;
  weightedScore: number;
}

interface TimelineEvent {
  round: number;
  event: string;
  timestamp: string;
}

interface GameSession {
  id: string;
  gameName: string;
  playerCount: number;
  players: PlayerInSession[];
  status: 'pending' | 'playing' | 'finished';
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  rounds?: number;
  notes: StrategyNote[];
  results?: PlayerResult[];
  timeline: TimelineEvent[];
}

interface GameRanking {
  name: string;
  totalSessions: number;
  averageDuration: number;
  averageRounds: number;
  totalNotes: number;
  isFavorite: boolean;
}

function calculateWeightedScore(rank: number, playerCount: number, durationMinutes: number): number {
  let baseScore = 1;
  if (rank === 1) baseScore = 10;
  else if (rank === 2) baseScore = 6;
  else if (rank === 3) baseScore = 3;
  return baseScore + durationMinutes * 0.5;
}

app.get('/sessions', (_req, res) => {
  const sessions = readJSONFile<GameSession[]>('sessions.json');
  res.json(sessions);
});

app.get('/sessions/:id', (req, res) => {
  const sessions = readJSONFile<GameSession[]>('sessions.json');
  const session = sessions.find(s => s.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

app.post('/sessions', (req, res) => {
  const { gameName, playerCount, players } = req.body;
  const sessions = readJSONFile<GameSession[]>('sessions.json');

  const newSession: GameSession = {
    id: uuidv4(),
    gameName,
    playerCount,
    players,
    status: 'pending',
    startTime: dayjs().toISOString(),
    notes: [],
    timeline: []
  };

  sessions.push(newSession);
  writeJSONFile('sessions.json', sessions);

  const games = readJSONFile<GameRanking[]>('games.json');
  const gameIndex = games.findIndex(g => g.name === gameName);
  if (gameIndex === -1) {
    games.push({
      name: gameName,
      totalSessions: 1,
      averageDuration: 0,
      averageRounds: 0,
      totalNotes: 0,
      isFavorite: false
    });
  }
  writeJSONFile('games.json', games);

  res.status(201).json(newSession);
});

app.put('/sessions/:id', (req, res) => {
  const sessions = readJSONFile<GameSession[]>('sessions.json');
  const index = sessions.findIndex(s => s.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const { status, results, rounds } = req.body;
  const session = sessions[index];

  if (status) session.status = status;

  if (status === 'playing' && session.status === 'playing') {
    session.timeline.push({
      round: rounds || 1,
      event: '回合开始',
      timestamp: dayjs().toISOString()
    });
  }

  if (status === 'finished' && results) {
    session.endTime = dayjs().toISOString();
    session.durationMinutes = dayjs().diff(dayjs(session.startTime), 'minute');
    session.rounds = rounds;

    const resultsWithWeighted = results.map((r: Omit<PlayerResult, 'weightedScore'>) => ({
      ...r,
      weightedScore: calculateWeightedScore(r.rank, session.playerCount, session.durationMinutes!)
    }));

    session.results = resultsWithWeighted;

    updatePlayerStats(session);
    updateGameStats(session);
  }

  sessions[index] = session;
  writeJSONFile('sessions.json', sessions);

  res.json(session);
});

function updatePlayerStats(session: GameSession): void {
  const players = readJSONFile<Record<string, any>>('players.json');

  session.results?.forEach(result => {
    const playerId = result.playerId;
    if (!players[playerId]) {
      players[playerId] = {
        playerId,
        playerName: result.playerName,
        totalGames: 0,
        wins: 0,
        winRate: 0,
        averageScore: 0,
        longestWinStreak: 0,
        currentWinStreak: 0,
        totalScore: 0,
        recentScores: [],
        gameDistribution: {}
      };
    }

    const player = players[playerId];
    player.totalGames += 1;
    player.totalScore += result.weightedScore;
    player.averageScore = player.totalScore / player.totalGames;

    if (result.rank === 1) {
      player.wins += 1;
      player.currentWinStreak += 1;
      player.longestWinStreak = Math.max(player.longestWinStreak, player.currentWinStreak);
    } else {
      player.currentWinStreak = 0;
    }

    player.winRate = player.wins / player.totalGames;

    player.recentScores.unshift({
      gameName: session.gameName,
      score: result.weightedScore,
      won: result.rank === 1,
      date: session.endTime
    });
    player.recentScores = player.recentScores.slice(0, 10);

    if (!player.gameDistribution[session.gameName]) {
      player.gameDistribution[session.gameName] = 0;
    }
    player.gameDistribution[session.gameName] += 1;

    players[playerId] = player;
  });

  writeJSONFile('players.json', players);
}

function updateGameStats(session: GameSession): void {
  const games = readJSONFile<GameRanking[]>('games.json');
  const gameIndex = games.findIndex(g => g.name === session.gameName);

  if (gameIndex !== -1) {
    const game = games[gameIndex];
    const oldTotal = game.totalSessions;
    game.totalSessions += 1;

    if (session.durationMinutes) {
      game.averageDuration = Math.round(
        (game.averageDuration * oldTotal + session.durationMinutes) / game.totalSessions
      );
    }
    if (session.rounds) {
      game.averageRounds = Math.round(
        (game.averageRounds * oldTotal + session.rounds) / game.totalSessions
      );
    }
    game.totalNotes += session.notes.length;

    games[gameIndex] = game;
    writeJSONFile('games.json', games);
  }
}

app.post('/sessions/:id/notes', (req, res) => {
  const sessions = readJSONFile<GameSession[]>('sessions.json');
  const index = sessions.findIndex(s => s.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const { playerId, playerName, playerAvatar, round, content } = req.body;

  const newNote: StrategyNote = {
    id: uuidv4(),
    playerId,
    playerName,
    playerAvatar,
    round,
    content,
    likes: 0,
    likedBy: [],
    timestamp: dayjs().toISOString()
  };

  sessions[index].notes.push(newNote);
  writeJSONFile('sessions.json', sessions);

  res.status(201).json(newNote);
});

app.post('/sessions/:id/notes/:noteId/like', (req, res) => {
  const sessions = readJSONFile<GameSession[]>('sessions.json');
  const sessionIndex = sessions.findIndex(s => s.id === req.params.id);

  if (sessionIndex === -1) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const noteIndex = sessions[sessionIndex].notes.findIndex(n => n.id === req.params.noteId);
  if (noteIndex === -1) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }

  const { playerId } = req.body;
  const note = sessions[sessionIndex].notes[noteIndex];

  const likedIndex = note.likedBy.indexOf(playerId);
  if (likedIndex === -1) {
    note.likedBy.push(playerId);
    note.likes += 1;
  } else {
    note.likedBy.splice(likedIndex, 1);
    note.likes -= 1;
  }

  writeJSONFile('sessions.json', sessions);
  res.json(note);
});

app.get('/players/:id/stats', (req, res) => {
  const players = readJSONFile<Record<string, any>>('players.json');
  const player = players[req.params.id];

  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  const gameList = Object.entries(player.gameDistribution).map(([gameName, count]) => ({
    gameName,
    count: count as number,
    percentage: Math.round(((count as number) / player.totalGames) * 100)
  }));

  res.json({
    playerId: player.playerId,
    playerName: player.playerName,
    totalGames: player.totalGames,
    wins: player.wins,
    winRate: Math.round(player.winRate * 100) / 100,
    averageScore: Math.round(player.averageScore * 10) / 10,
    longestWinStreak: player.longestWinStreak,
    currentWinStreak: player.currentWinStreak,
    recentScores: player.recentScores,
    gameDistribution: gameList
  });
});

app.get('/games/rankings', (_req, res) => {
  const games = readJSONFile<GameRanking[]>('games.json');
  res.json(games);
});

app.post('/games/:name/favorite', (req, res) => {
  const games = readJSONFile<GameRanking[]>('games.json');
  const index = games.findIndex(g => g.name === req.params.name);

  if (index === -1) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  games[index].isFavorite = !games[index].isFavorite;
  writeJSONFile('games.json', games);

  res.json(games[index]);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
