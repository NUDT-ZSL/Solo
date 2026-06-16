import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

interface PlayerState {
  id: string;
  name: string;
  mineralCount: number;
  color: string;
}

interface RoomState {
  id: string;
  players: PlayerState[];
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

const rooms: Map<string, RoomState> = new Map();
const globalLeaderboard: PlayerState[] = [];

interface MatchRequest {
  playerNames: string[];
}

interface MatchResponse {
  roomId: string;
  players: {
    id: string;
    name: string;
    color: string;
  }[];
}

interface StateUpdateRequest {
  roomId: string;
  players: {
    id: string;
    name: string;
    mineralCount: number;
    color: string;
  }[];
}

interface LeaderboardEntry {
  playerId: string;
  name: string;
  mineralCount: number;
}

app.post('/api/match', (req, res) => {
  try {
    const { playerNames } = req.body as MatchRequest;
    
    if (!playerNames || !Array.isArray(playerNames) || playerNames.length === 0) {
      return res.status(400).json({ error: 'Invalid player names' });
    }

    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D'];
    const players = playerNames.map((name, index) => ({
      id: uuidv4(),
      name,
      mineralCount: 0,
      color: colors[index % colors.length],
    }));

    const roomId = uuidv4();
    const room: RoomState = {
      id: roomId,
      players,
      status: 'waiting',
      createdAt: Date.now(),
    };

    rooms.set(roomId, room);

    const response: MatchResponse = {
      roomId,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

app.post('/api/state', (req, res) => {
  try {
    const { roomId, players } = req.body as StateUpdateRequest;

    if (!roomId || !players) {
      return res.status(400).json({ error: 'Invalid state update' });
    }

    const room = rooms.get(roomId);
    if (room) {
      room.players = players.map(p => ({
        id: p.id,
        name: p.name,
        mineralCount: p.mineralCount,
        color: p.color,
      }));

      players.forEach(p => {
        const existingIndex = globalLeaderboard.findIndex(gp => gp.id === p.id);
        if (existingIndex >= 0) {
          globalLeaderboard[existingIndex] = {
            ...globalLeaderboard[existingIndex],
            mineralCount: Math.max(globalLeaderboard[existingIndex].mineralCount, p.mineralCount),
          };
        } else {
          globalLeaderboard.push({
            id: p.id,
            name: p.name,
            mineralCount: p.mineralCount,
            color: p.color,
          });
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating state:', error);
    res.status(500).json({ error: 'Failed to update state' });
  }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const allPlayers: PlayerState[] = [];

    rooms.forEach(room => {
      room.players.forEach(player => {
        allPlayers.push({ ...player });
      });
    });

    globalLeaderboard.forEach(player => {
      const existing = allPlayers.find(p => p.id === player.id);
      if (!existing) {
        allPlayers.push({ ...player });
      } else {
        existing.mineralCount = Math.max(existing.mineralCount, player.mineralCount);
      }
    });

    const leaderboard: LeaderboardEntry[] = allPlayers
      .sort((a, b) => b.mineralCount - a.mineralCount)
      .slice(0, 10)
      .map(p => ({
        playerId: p.id,
        name: p.name,
        mineralCount: p.mineralCount,
      }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, players: globalLeaderboard.length });
});

app.listen(PORT, () => {
  console.log(`🚀 Space Mining Race Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
