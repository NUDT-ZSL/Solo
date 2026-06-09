import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import {
  Track,
  User,
  ClientMessage,
  ServerMessage,
  INSTRUMENTS,
  USER_COLORS,
} from '../types.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

interface Room {
  code: string;
  users: Map<string, User>;
  tracks: Track[];
  createdAt: number;
}

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  roomCode?: string;
}

const rooms = new Map<string, Room>();

const defaultColors = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
];

const createDefaultTracks = (): Track[] => {
  return INSTRUMENTS.map((inst, idx) => ({
    id: idx,
    name: inst.name,
    instrument: inst.type,
    color: defaultColors[idx],
    volume: 75,
    pan: 0,
    reverb: 20,
    delay: 10,
    distortion: 0,
    steps: new Array(16).fill(false),
  }));
};

const generateRoomCode = (): string => {
  let code: string;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
};

const broadcastToRoom = (roomCode: string, message: ServerMessage, excludeUserId?: string) => {
  const room = rooms.get(roomCode);
  if (!room) return;

  const data = JSON.stringify(message);

  wss.clients.forEach((client) => {
    const ws = client as ExtendedWebSocket;
    if (
      ws.readyState === WebSocket.OPEN &&
      ws.roomCode === roomCode &&
      ws.userId !== excludeUserId
    ) {
      ws.send(data);
    }
  });
};

const sendToClient = (ws: WebSocket, message: ServerMessage) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

wss.on('connection', (ws: ExtendedWebSocket) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case 'create_room': {
          const roomCode = generateRoomCode();
          const userId = msg.userId;
          const colorIdx = Math.floor(Math.random() * USER_COLORS.length);
          const user: User = {
            id: userId,
            name: msg.userName.trim().slice(0, 3).toUpperCase(),
            color: USER_COLORS[colorIdx],
          };

          const room: Room = {
            code: roomCode,
            users: new Map([[userId, user]]),
            tracks: createDefaultTracks(),
            createdAt: Date.now(),
          };

          rooms.set(roomCode, room);
          ws.userId = userId;
          ws.roomCode = roomCode;

          console.log(`Room ${roomCode} created by ${user.name}`);

          const initMsg: ServerMessage = {
            type: 'init',
            tracks: room.tracks,
            users: Array.from(room.users.values()),
          };
          sendToClient(ws, initMsg);
          break;
        }

        case 'join_room': {
          const room = rooms.get(msg.roomCode);
          if (!room) {
            console.log(`Room ${msg.roomCode} not found`);
            ws.close();
            break;
          }

          const userId = msg.userId;
          const colorIdx = Math.floor(Math.random() * USER_COLORS.length);
          const user: User = {
            id: userId,
            name: msg.userName.trim().slice(0, 3).toUpperCase(),
            color: USER_COLORS[colorIdx],
          };

          room.users.set(userId, user);
          ws.userId = userId;
          ws.roomCode = msg.roomCode;

          console.log(`User ${user.name} joined room ${msg.roomCode}`);

          const initMsg: ServerMessage = {
            type: 'init',
            tracks: room.tracks,
            users: Array.from(room.users.values()),
          };
          sendToClient(ws, initMsg);

          const userJoinedMsg: ServerMessage = {
            type: 'user_joined',
            user,
          };
          broadcastToRoom(msg.roomCode, userJoinedMsg, userId);
          break;
        }

        case 'cell_click': {
          if (!ws.roomCode || !ws.userId) break;
          const room = rooms.get(ws.roomCode);
          if (!room) break;

          const { trackId, stepIndex, active } = msg.data;
          const track = room.tracks.find(t => t.id === trackId);
          if (track) {
            track.steps[stepIndex] = active;
          }

          broadcastToRoom(ws.roomCode, {
            type: 'cell_click',
            data: msg.data,
          });
          break;
        }

        case 'mixer_change': {
          if (!ws.roomCode || !ws.userId) break;
          const room = rooms.get(ws.roomCode);
          if (!room) break;

          const { trackId, param, value } = msg.data;
          const track = room.tracks.find(t => t.id === trackId);
          if (track) {
            (track as any)[param] = value;
          }

          broadcastToRoom(ws.roomCode, {
            type: 'mixer_change',
            data: msg.data,
          });
          break;
        }

        case 'track_color': {
          if (!ws.roomCode || !ws.userId) break;
          const room = rooms.get(ws.roomCode);
          if (!room) break;

          const { trackId, color } = msg.data;
          const track = room.tracks.find(t => t.id === trackId);
          if (track) {
            track.color = color;
          }

          broadcastToRoom(ws.roomCode, {
            type: 'track_color',
            data: msg.data,
          });
          break;
        }

        case 'cursor_move': {
          if (!ws.roomCode || !ws.userId) break;
          const room = rooms.get(ws.roomCode);
          if (!room) break;

          const user = room.users.get(ws.userId);
          if (!user) break;

          user.x = msg.x;
          user.y = msg.y;

          broadcastToRoom(ws.roomCode, {
            type: 'cursor_move',
            user,
          }, ws.userId);
          break;
        }
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('close', () => {
    if (ws.roomCode && ws.userId) {
      const room = rooms.get(ws.roomCode);
      if (room) {
        room.users.delete(ws.userId);
        console.log(`User ${ws.userId} left room ${ws.roomCode}`);

        if (room.users.size === 0) {
          setTimeout(() => {
            const currentRoom = rooms.get(ws.roomCode!);
            if (currentRoom && currentRoom.users.size === 0) {
              rooms.delete(ws.roomCode!);
              console.log(`Room ${ws.roomCode} deleted (empty)`);
            }
          }, 60000);
        } else {
          broadcastToRoom(ws.roomCode, {
            type: 'user_left',
            userId: ws.userId,
          });
        }
      }
    }
    console.log('Client disconnected');
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Virtual Band server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
