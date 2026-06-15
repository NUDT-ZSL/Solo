import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { nanoid } from 'nanoid';

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface Stroke {
  id: string;
  userId: string;
  color: string;
  thickness: number;
  points: Point[];
  startTime: number;
  endTime: number;
}

interface Room {
  id: string;
  users: Map<string, WebSocket>;
  strokes: Stroke[];
  createdAt: number;
}

interface WSMessage {
  type: string;
  roomId?: string;
  userId?: string;
  stroke?: Stroke;
  strokeId?: string;
  point?: Point;
  strokes?: Stroke[];
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      users: new Map(),
      strokes: [],
      createdAt: Date.now(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(room: Room, message: WSMessage, excludeUserId?: string) {
  const data = JSON.stringify(message);
  room.users.forEach((ws, userId) => {
    if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  ws.on('message', (data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'join': {
          const { roomId, userId } = message;
          if (!roomId || !userId) return;

          const room = getOrCreateRoom(roomId);
          room.users.set(userId, ws);
          currentRoomId = roomId;
          currentUserId = userId;

          ws.send(JSON.stringify({
            type: 'init-strokes',
            strokes: room.strokes,
          }));
          break;
        }

        case 'stroke-start': {
          if (!currentRoomId || !message.stroke) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          room.strokes.push(message.stroke);
          broadcastToRoom(room, message, currentUserId!);
          break;
        }

        case 'stroke-point': {
          if (!currentRoomId || !message.strokeId || !message.point) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const stroke = room.strokes.find(s => s.id === message.strokeId);
          if (stroke) {
            stroke.points.push(message.point);
            stroke.endTime = message.point.timestamp;
          }
          broadcastToRoom(room, message, currentUserId!);
          break;
        }

        case 'stroke-end': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          broadcastToRoom(room, message, currentUserId!);
          break;
        }

        case 'clear-canvas': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          room.strokes = [];
          broadcastToRoom(room, message);
          break;
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentUserId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.users.delete(currentUserId);
      }
    }
  });
});

app.get('/api/room/:roomId/strokes', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.json({ strokes: [] });
    return;
  }
  res.json({ strokes: room.strokes });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
