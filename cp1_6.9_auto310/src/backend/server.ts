import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

interface Card {
  id: string;
  word: string;
  x: number;
  y: number;
  hue: number;
}

interface Connection {
  from: string;
  to: string;
}

interface Poem {
  id: string;
  cards: Card[];
  connections: Connection[];
  emotionMap: Record<string, number>;
  title?: string;
  createdAt: number;
}

const poemsStorage: Map<string, Poem> = new Map();
const activeRooms: Map<string, { cards: Card[]; connections: Connection[] }> = new Map();

app.get('/api/poems', (_req, res) => {
  const poems = Array.from(poemsStorage.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json(poems);
});

app.get('/api/poems/:id', (req, res) => {
  const poem = poemsStorage.get(req.params.id);
  if (!poem) {
    res.status(404).json({ error: '作品未找到' });
    return;
  }
  res.json(poem);
});

app.post('/api/poems', (req, res) => {
  const { cards, connections, emotionMap, title } = req.body;
  const id = uuidv4();
  const poem: Poem = {
    id,
    cards: cards || [],
    connections: connections || [],
    emotionMap: emotionMap || {},
    title,
    createdAt: Date.now()
  };
  poemsStorage.set(id, poem);
  res.status(201).json(poem);
});

app.put('/api/poems/:id', (req, res) => {
  const poem = poemsStorage.get(req.params.id);
  if (!poem) {
    res.status(404).json({ error: '作品未找到' });
    return;
  }
  const { cards, connections, emotionMap, title } = req.body;
  const updated: Poem = {
    ...poem,
    cards: cards || poem.cards,
    connections: connections || poem.connections,
    emotionMap: emotionMap || poem.emotionMap,
    title: title ?? poem.title,
    createdAt: poem.createdAt
  };
  poemsStorage.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/poems/:id', (req, res) => {
  const deleted = poemsStorage.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: '作品未找到' });
    return;
  }
  res.json({ success: true });
});

app.post('/save', (req, res) => {
  const { cards, connections, emotionMap, title } = req.body;
  const id = uuidv4();
  const poem: Poem = {
    id,
    cards: cards || [],
    connections: connections || [],
    emotionMap: emotionMap || {},
    title,
    createdAt: Date.now()
  };
  poemsStorage.set(id, poem);
  res.json({ id, poem });
});

app.get('/load/:id', (req, res) => {
  const poem = poemsStorage.get(req.params.id);
  if (!poem) {
    res.status(404).json({ error: '作品未找到' });
    return;
  }
  res.json(poem);
});

const roomSockets: Map<string, Set<string>> = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    if (!roomSockets.has(roomId)) {
      roomSockets.set(roomId, new Set());
    }
    roomSockets.get(roomId)!.add(socket.id);

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, { cards: [], connections: [] });
    }
    const room = activeRooms.get(roomId)!;
    socket.emit('room-state', room);
  });

  socket.on('add-card', (roomId: string, card: Card) => {
    const room = activeRooms.get(roomId);
    if (room) {
      room.cards.push(card);
      socket.to(roomId).emit('card-added', card);
    }
  });

  socket.on('remove-card', (roomId: string, cardId: string) => {
    const room = activeRooms.get(roomId);
    if (room) {
      room.cards = room.cards.filter((c) => c.id !== cardId);
      room.connections = room.connections.filter(
        (c) => c.from !== cardId && c.to !== cardId
      );
      socket.to(roomId).emit('card-removed', cardId);
    }
  });

  socket.on('move-card', (roomId: string, cardId: string, x: number, y: number) => {
    const room = activeRooms.get(roomId);
    if (room) {
      const card = room.cards.find((c) => c.id === cardId);
      if (card) {
        card.x = x;
        card.y = y;
        socket.to(roomId).emit('card-moved', { cardId, x, y });
      }
    }
  });

  socket.on('update-connections', (roomId: string, connections: Connection[]) => {
    const room = activeRooms.get(roomId);
    if (room) {
      room.connections = connections;
      socket.to(roomId).emit('connections-updated', connections);
    }
  });

  socket.on('clear-canvas', (roomId: string) => {
    const room = activeRooms.get(roomId);
    if (room) {
      room.cards = [];
      room.connections = [];
      socket.to(roomId).emit('canvas-cleared');
    }
  });

  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    const sockets = roomSockets.get(roomId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        roomSockets.delete(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    roomSockets.forEach((sockets, roomId) => {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          roomSockets.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`织言诗笺 服务器运行在端口 ${PORT}`);
});
