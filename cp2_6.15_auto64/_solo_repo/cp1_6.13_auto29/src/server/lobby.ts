import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { addScore, getTopScores, ScoreRecord } from './scoreboard';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

interface Room {
  id: string;
  player1: string | null;
  player2: string | null;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
}

const rooms: Map<string, Room> = new Map();

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/api/rooms', (req: Request, res: Response) => {
  const { playerName } = req.body;
  
  const roomId = uuidv4();
  const room: Room = {
    id: roomId,
    player1: playerName || 'Player1',
    player2: null,
    status: 'waiting',
    createdAt: new Date()
  };
  
  rooms.set(roomId, room);
  
  res.json({
    roomId,
    room
  });
});

app.post('/api/rooms/:roomId/join', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { playerName } = req.body;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.status !== 'waiting') {
    return res.status(400).json({ error: 'Room is not waiting for players' });
  }
  
  if (room.player2) {
    return res.status(400).json({ error: 'Room is full' });
  }
  
  room.player2 = playerName || 'Player2';
  room.status = 'waiting';
  
  res.json({ room });
});

app.get('/api/rooms/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({ room });
});

app.post('/api/rooms/:roomId/start', (req: Request, res: Response) => {
  const { roomId } = req.params;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  room.status = 'playing';
  
  res.json({ room });
});

app.post('/api/rooms/:roomId/finish', (req: Request, res: Response) => {
  const { roomId } = req.params;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  room.status = 'finished';
  
  res.json({ room });
});

app.get('/api/scores', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const scores = await getTopScores(limit);
    
    const formattedScores = scores.map((score: ScoreRecord) => ({
      _id: score._id,
      playerName: score.playerName,
      time: score.time,
      createdAt: score.createdAt
    }));
    
    res.json(formattedScores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

app.post('/api/scores', async (req: Request, res: Response) => {
  try {
    const { playerName, name, time } = req.body;
    
    const finalName = name || playerName;
    
    if (!finalName || typeof time !== 'number') {
      return res.status(400).json({ error: 'name (or playerName) and time are required' });
    }
    
    const score = await addScore(finalName, time);
    
    res.status(201).json({
      _id: score._id,
      playerName: score.playerName,
      name: score.playerName,
      time: score.time,
      createdAt: score.createdAt
    });
  } catch (error) {
    console.error('Error adding score:', error);
    res.status(500).json({ error: 'Failed to add score' });
  }
});

app.listen(PORT, () => {
  console.log(`ShadowRacer server running on port ${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/health - Health check`);
  console.log(`  POST /api/rooms - Create room`);
  console.log(`  POST /api/rooms/:id/join - Join room`);
  console.log(`  GET  /api/rooms/:id - Get room status`);
  console.log(`  GET  /api/scores - Get leaderboard`);
  console.log(`  POST /api/scores - Submit score`);
});
