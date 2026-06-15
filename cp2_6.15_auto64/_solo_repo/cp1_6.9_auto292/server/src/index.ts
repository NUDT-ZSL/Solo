import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

interface BandConfig {
  index: number;
  energy: number;
  gain: number;
  radius: number;
}

interface VoiceprintConfig {
  id?: string;
  bands: BandConfig[];
  createdAt?: number;
}

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const storage = new Map<string, VoiceprintConfig>();

const roomStates = new Map<string, Map<number, BandConfig>>();

app.post('/api/save-token', (req, res) => {
  try {
    const config: VoiceprintConfig = req.body;
    if (!config.bands || !Array.isArray(config.bands)) {
      return res.status(400).json({ error: 'Invalid voiceprint configuration' });
    }
    const id = nanoid(8);
    const savedConfig: VoiceprintConfig = {
      ...config,
      id,
      createdAt: Date.now(),
    };
    storage.set(id, savedConfig);
    res.json({ id, config: savedConfig });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save voiceprint' });
  }
});

app.get('/api/token/:id', (req, res) => {
  const { id } = req.params;
  const config = storage.get(id);
  if (!config) {
    return res.status(404).json({ error: 'Voiceprint not found' });
  }
  res.json(config);
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  path: '/ws',
});

interface DragMessage {
  tokenId: string;
  bandIndex: number;
  radius: number;
  gain: number;
}

io.on('connection', (socket) => {
  let currentRoom: string | null = null;

  socket.on('join-room', (tokenId: string) => {
    if (currentRoom) {
      socket.leave(currentRoom);
    }
    currentRoom = tokenId;
    socket.join(tokenId);

    if (!roomStates.has(tokenId)) {
      roomStates.set(tokenId, new Map());
    }

    const roomState = roomStates.get(tokenId)!;
    const stateArray = Array.from(roomState.values());
    if (stateArray.length > 0) {
      socket.emit('room-state', { bands: stateArray });
    }
  });

  socket.on('band-update', (msg: DragMessage) => {
    if (!currentRoom) return;

    const roomState = roomStates.get(msg.tokenId);
    if (!roomState) return;

    roomState.set(msg.bandIndex, {
      index: msg.bandIndex,
      energy: 0,
      gain: msg.gain,
      radius: msg.radius,
    });

    socket.to(msg.tokenId).emit('band-sync', {
      bandIndex: msg.bandIndex,
      radius: msg.radius,
      gain: msg.gain,
    });
  });

  socket.on('leave-room', () => {
    if (currentRoom) {
      socket.leave(currentRoom);
      currentRoom = null;
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const roomState = roomStates.get(currentRoom);
      if (roomState && io.sockets.adapter.rooms.get(currentRoom)?.size === 0) {
        roomStates.delete(currentRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Voiceprint server running on port ${PORT}`);
});
