import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import { roomManager } from './roomManager';
import type { Item, Wall } from '../types';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(bodyParser.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/rooms', (req, res) => {
  const { name, designerId } = req.body;
  const room = roomManager.createEscapeRoom(name || '未命名密室', designerId || 'anonymous');
  res.json(room);
});

app.get('/api/rooms/:id', (req, res) => {
  const room = roomManager.getEscapeRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(room);
});

app.put('/api/rooms/:id', (req, res) => {
  const room = roomManager.updateEscapeRoom(req.params.id, req.body);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(room);
});

app.post('/api/rooms/:id/rooms', (req, res) => {
  const { name } = req.body;
  const newRoom = roomManager.addRoom(req.params.id, name || '新房间');
  if (!newRoom) {
    res.status(400).json({ error: 'Cannot add more rooms' });
    return;
  }
  res.json(newRoom);
});

app.put('/api/rooms/:escapeRoomId/rooms/:roomId', (req, res) => {
  const room = roomManager.updateRoom(req.params.escapeRoomId, req.params.roomId, req.body);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(room);
});

app.post('/api/rooms/:escapeRoomId/rooms/:roomId/items', (req, res) => {
  const item = roomManager.addItem(req.params.escapeRoomId, req.params.roomId, req.body);
  if (!item) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json(item);
});

app.put('/api/rooms/:escapeRoomId/rooms/:roomId/items/:itemId', (req, res) => {
  const item = roomManager.updateItem(req.params.escapeRoomId, req.params.roomId, req.params.itemId, req.body);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json(item);
});

app.delete('/api/rooms/:escapeRoomId/rooms/:roomId/items/:itemId', (req, res) => {
  const success = roomManager.removeItem(req.params.escapeRoomId, req.params.roomId, req.params.itemId);
  if (!success) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/rooms/:escapeRoomId/rooms/:roomId/walls', (req, res) => {
  const { x, y, visible } = req.body;
  const wall = roomManager.setWall(req.params.escapeRoomId, req.params.roomId, x, y, visible);
  if (!wall) {
    res.status(400).json({ error: 'Invalid wall position' });
    return;
  }
  res.json(wall);
});

app.post('/api/sessions', (req, res) => {
  const { escapeRoomId, playerName } = req.body;
  const session = roomManager.createGameSession(escapeRoomId, playerName || '玩家');
  if (!session) {
    res.status(404).json({ error: 'Escape room not found' });
    return;
  }
  res.json(session);
});

app.get('/api/sessions/:id', (req, res) => {
  const session = roomManager.getGameSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_session', ({ sessionId, playerId }) => {
    socket.join(sessionId);
    console.log(`Player ${playerId} joined session ${sessionId}`);
    
    const session = roomManager.getGameSession(sessionId);
    if (session) {
      io.to(sessionId).emit('session_updated', session);
    }
  });

  socket.on('solve_puzzle', ({ sessionId, playerId, itemId, answer }) => {
    const result = roomManager.solvePuzzle(sessionId, playerId, itemId, answer);
    const session = roomManager.getGameSession(sessionId);
    
    socket.emit('puzzle_result', { itemId, ...result });
    
    if (session) {
      io.to(sessionId).emit('session_updated', session);
    }
    
    if (result.allSolved) {
      io.to(sessionId).emit('game_complete', {
        playerId,
        stats: roomManager.getPlayerStats(sessionId, playerId)
      });
    }
  });

  socket.on('collect_item', ({ sessionId, playerId, itemId }) => {
    const result = roomManager.collectItem(sessionId, playerId, itemId);
    const session = roomManager.getGameSession(sessionId);
    
    socket.emit('item_collected', { itemId, ...result });
    
    if (session) {
      io.to(sessionId).emit('session_updated', session);
    }
  });

  socket.on('move_room', ({ sessionId, playerId, roomId }) => {
    const result = roomManager.moveToRoom(sessionId, playerId, roomId);
    const session = roomManager.getGameSession(sessionId);
    
    socket.emit('room_changed', { roomId, ...result });
    
    if (session) {
      io.to(sessionId).emit('session_updated', session);
    }
  });

  socket.on('designer_update', ({ escapeRoomId }) => {
    const room = roomManager.getEscapeRoom(escapeRoomId);
    if (room) {
      io.emit(`designer_update_${escapeRoomId}`, room);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, server, io };
