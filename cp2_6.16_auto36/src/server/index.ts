import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import {
  initDatabase,
  getInstruments,
  getRooms,
  getRoomById,
  createRoom,
  addRoomUser,
  removeRoomUser,
  getRoomUsers,
} from './database';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  roomId: string;
  userName: string;
  instrument: string;
}

const clients = new Map<string, ConnectedClient>();
const roomClients = new Map<string, Set<string>>();

const broadcastToRoom = (roomId: string, message: object, excludeUserId?: string) => {
  const roomClientIds = roomClients.get(roomId);
  if (!roomClientIds) return;

  const messageStr = JSON.stringify(message);
  roomClientIds.forEach((clientId) => {
    if (excludeUserId && clientId === excludeUserId) return;
    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
};

const addClientToRoom = (client: ConnectedClient) => {
  clients.set(client.userId, client);

  if (!roomClients.has(client.roomId)) {
    roomClients.set(client.roomId, new Set());
  }
  roomClients.get(client.roomId)!.add(client.userId);

  addRoomUser(
    `${client.roomId}-${client.userId}`,
    client.roomId,
    client.userId,
    client.userName,
    client.instrument
  ).catch(console.error);

  broadcastToRoom(
    client.roomId,
    {
      type: 'userJoined',
      user: {
        id: client.userId,
        name: client.userName,
        instrument: client.instrument,
      },
    },
    client.userId
  );

  getRoomUsers(client.roomId).then((users) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(
        JSON.stringify({
          type: 'users',
          users,
        })
      );
    }
  });
};

const removeClient = (userId: string) => {
  const client = clients.get(userId);
  if (!client) return;

  const { roomId } = client;

  clients.delete(userId);

  const roomClientIds = roomClients.get(roomId);
  if (roomClientIds) {
    roomClientIds.delete(userId);
    if (roomClientIds.size === 0) {
      roomClients.delete(roomId);
    }
  }

  removeRoomUser(userId, roomId).catch(console.error);

  broadcastToRoom(roomId, {
    type: 'userLeft',
    userId,
  });
};

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', 'http://localhost');
  const roomId = url.searchParams.get('roomId') || 'default-room';
  const userId = url.searchParams.get('userId') || uuidv4();
  const userName = `玩家${Math.floor(Math.random() * 1000)}`;
  const instrument = 'piano';

  const client: ConnectedClient = {
    ws,
    userId,
    roomId,
    userName,
    instrument,
  };

  addClientToRoom(client);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'note': {
          const noteData = {
            ...message,
            userId,
          };
          broadcastToRoom(roomId, noteData, userId);
          break;
        }

        case 'userInfo': {
          const currentClient = clients.get(userId);
          if (currentClient && message.user) {
            currentClient.userName = message.user.name || currentClient.userName;
            currentClient.instrument = message.user.instrument || currentClient.instrument;

            addRoomUser(
              `${roomId}-${userId}`,
              roomId,
              userId,
              currentClient.userName,
              currentClient.instrument
            ).catch(console.error);

            broadcastToRoom(
              roomId,
              {
                type: 'userUpdate',
                user: {
                  id: userId,
                  name: currentClient.userName,
                  instrument: currentClient.instrument,
                },
              },
              userId
            );
          }
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    removeClient(userId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    removeClient(userId);
  });
});

app.get('/api/instruments', async (req, res) => {
  try {
    const instruments = await getInstruments();
    res.json({ success: true, data: instruments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch instruments' });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await getRooms();
    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
  }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const room = await getRoomById(req.params.id);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }
    const users = await getRoomUsers(req.params.id);
    res.json({ success: true, data: { ...room, users } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch room' });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { name, maxUsers } = req.body;
    const id = uuidv4();
    const room = await createRoom(id, name || '新合奏室', maxUsers || 10);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create room' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', connectedClients: clients.size });
});

const startServer = async () => {
  try {
    await initDatabase();
    console.log('Database initialized successfully');

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server is ready on ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
