import { WebSocketServer, WebSocket } from 'ws';
import {
  Stroke,
  StickyNote,
  User,
  ServerMessage,
  ClientMessage,
  SerializedRoomState,
  Point
} from './types.js';

interface Room {
  roomCode: string;
  strokes: Map<string, Stroke>;
  notes: Map<string, StickyNote>;
  users: Map<string, User>;
  tempStrokes: Map<string, { color: string; userId: string; points: Point[] }>;
}

interface ClientSocket extends WebSocket {
  userId?: string;
  roomCode?: string;
  isAlive?: boolean;
}

const USER_COLORS = [
  '#FF5252', '#FF7043', '#FFD54F', '#66BB6A',
  '#42A5F5', '#AB47BC', '#EC407A', '#424242'
];

const rooms = new Map<string, Room>();
const clients = new Map<string, ClientSocket>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substring(2, 11);
}

function getAvailableColor(room: Room): string {
  const usedColors = new Set(Array.from(room.users.values()).map(u => u.color));
  for (const color of USER_COLORS) {
    if (!usedColors.has(color)) return color;
  }
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function serializeRoom(room: Room): SerializedRoomState {
  return {
    roomCode: room.roomCode,
    strokes: Array.from(room.strokes.values()),
    notes: Array.from(room.notes.values()),
    users: Array.from(room.users.values())
  };
}

function broadcastToRoom(roomCode: string, message: ServerMessage, excludeUserId?: string) {
  const data = JSON.stringify(message);
  for (const [userId, ws] of clients) {
    if (ws.roomCode === roomCode && userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function sendToClient(userId: string, message: ServerMessage) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function handleMessage(ws: ClientSocket, message: string) {
  let data: ClientMessage;
  try {
    data = JSON.parse(message);
  } catch {
    return;
  }

  const userId = ws.userId;
  if (!userId) return;

  switch (data.type) {
    case 'createRoom': {
      const roomCode = generateRoomCode();
      const color = USER_COLORS[0];
      const user: User = {
        id: userId,
        name: '用户' + userId.slice(-4),
        color
      };

      const room: Room = {
        roomCode,
        strokes: new Map(),
        notes: new Map(),
        users: new Map([[userId, user]]),
        tempStrokes: new Map()
      };

      rooms.set(roomCode, room);
      ws.roomCode = roomCode;

      sendToClient(userId, {
        type: 'init',
        state: serializeRoom(room),
        userId,
        userColor: color
      });
      break;
    }

    case 'join': {
      const roomCode = data.roomCode.toUpperCase();
      const room = rooms.get(roomCode);

      if (!room) {
        ws.close(4000, '房间不存在');
        return;
      }

      const color = getAvailableColor(room);
      const user: User = {
        id: userId,
        name: '用户' + userId.slice(-4),
        color
      };

      room.users.set(userId, user);
      ws.roomCode = roomCode;

      sendToClient(userId, {
        type: 'init',
        state: serializeRoom(room),
        userId,
        userColor: color
      });

      broadcastToRoom(roomCode, {
        type: 'userJoin',
        user
      }, userId);
      break;
    }

    case 'addNote': {
      const room = rooms.get(ws.roomCode || '');
      if (!room) return;

      const note = { ...data.note, userId };
      room.notes.set(note.id, note);
      broadcastToRoom(room.roomCode, { type: 'addNote', note });
      break;
    }

    case 'updateNote': {
      const room = rooms.get(ws.roomCode || '');
      if (!room) return;

      const existing = room.notes.get(data.note.id);
      if (!existing) return;

      const updated = { ...existing, ...data.note, userId: existing.userId };
      room.notes.set(updated.id, updated);
      broadcastToRoom(room.roomCode, { type: 'updateNote', note: updated });
      break;
    }

    case 'strokeSegment': {
      const room = rooms.get(ws.roomCode || '');
      if (!room) return;

      if (!room.tempStrokes.has(data.strokeId)) {
        room.tempStrokes.set(data.strokeId, {
          color: data.color,
          userId,
          points: []
        });
      }

      const temp = room.tempStrokes.get(data.strokeId)!;
      temp.points.push(data.point);

      broadcastToRoom(room.roomCode, {
        type: 'strokeSegment',
        strokeId: data.strokeId,
        point: data.point,
        color: data.color,
        userId
      }, userId);
      break;
    }

    case 'strokeEnd': {
      const room = rooms.get(ws.roomCode || '');
      if (!room) return;

      const temp = room.tempStrokes.get(data.strokeId);
      if (!temp) return;

      const stroke: Stroke = {
        id: data.strokeId,
        points: temp.points,
        color: temp.color,
        userId: temp.userId,
        createdAt: Date.now()
      };

      room.strokes.set(stroke.id, stroke);
      room.tempStrokes.delete(data.strokeId);

      broadcastToRoom(room.roomCode, {
        type: 'strokeEnd',
        strokeId: data.strokeId
      });
      break;
    }

    case 'deleteItem': {
      const room = rooms.get(ws.roomCode || '');
      if (!room) return;

      if (data.itemType === 'stroke') {
        room.strokes.delete(data.id);
      } else {
        room.notes.delete(data.id);
      }

      broadcastToRoom(room.roomCode, {
        type: 'deleteItem',
        itemType: data.itemType,
        id: data.id
      });
      break;
    }

    case 'cursorMove': {
      const room = rooms.get(ws.roomCode || '');
      if (!room) return;

      const user = room.users.get(userId);
      if (user) {
        user.cursor = data.point;
      }

      broadcastToRoom(room.roomCode, {
        type: 'cursorMove',
        userId,
        point: data.point
      }, userId);
      break;
    }
  }
}

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on ws://localhost:${PORT}`);

wss.on('connection', (ws: ClientSocket) => {
  const userId = generateUserId();
  ws.userId = userId;
  ws.isAlive = true;
  clients.set(userId, ws);

  ws.on('message', (message) => handleMessage(ws, message.toString()));

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', () => {
    const roomCode = ws.roomCode;
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        room.users.delete(userId);
        room.tempStrokes.forEach((temp, id) => {
          if (temp.userId === userId) {
            room.tempStrokes.delete(id);
          }
        });

        broadcastToRoom(roomCode, {
          type: 'userLeave',
          userId
        });

        if (room.users.size === 0) {
          setTimeout(() => {
            const r = rooms.get(roomCode);
            if (r && r.users.size === 0) {
              rooms.delete(roomCode);
              console.log(`Room ${roomCode} cleaned up`);
            }
          }, 60000);
        }
      }
    }
    clients.delete(userId);
  });
});

setInterval(() => {
  for (const [, ws] of clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      ws.terminate();
    }
  }
}, 30000);
