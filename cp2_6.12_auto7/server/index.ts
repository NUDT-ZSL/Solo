import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

type CardColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

interface CardVotes {
  up: string[];
  down: string[];
}

interface Card {
  id: string;
  title: string;
  description: string;
  color: CardColor;
  x: number;
  y: number;
  votes: CardVotes;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

interface OnlineUser {
  id: string;
  name: string;
  avatarColor: string;
  cursor?: { x: number; y: number };
  editingCardId?: string | null;
  ws: WebSocket;
  roomId: string;
}

type ClientMessage =
  | { type: 'join'; userId: string; userName: string; avatarColor: string }
  | { type: 'card:create'; card: Card }
  | { type: 'card:update'; cardId: string; changes: Partial<Card> }
  | { type: 'card:delete'; cardId: string }
  | { type: 'card:vote'; cardId: string; vote: 'up' | 'down' | null }
  | { type: 'cursor:move'; x: number; y: number }
  | { type: 'card:editing'; cardId: string | null }
  | { type: 'ping' };

type ServerMessage =
  | { type: 'init'; cards: Card[]; users: Omit<OnlineUser, 'ws' | 'roomId'>[] }
  | { type: 'user:join'; user: Omit<OnlineUser, 'ws' | 'roomId'> }
  | { type: 'user:leave'; userId: string }
  | { type: 'card:created'; card: Card }
  | { type: 'card:updated'; cardId: string; changes: Partial<Card> }
  | { type: 'card:deleted'; cardId: string }
  | { type: 'card:voted'; cardId: string; votes: CardVotes }
  | { type: 'cursor:moved'; userId: string; x: number; y: number }
  | { type: 'card:editing'; userId: string; cardId: string | null }
  | { type: 'pong' };

class Room {
  id: string;
  cards: Map<string, Card> = new Map();
  users: Map<string, OnlineUser> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  broadcast(message: ServerMessage, excludeId?: string) {
    const data = JSON.stringify(message);
    this.users.forEach((user) => {
      if (user.id !== excludeId && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(data);
      }
    });
  }

  getPublicUsers(): Omit<OnlineUser, 'ws' | 'roomId'>[] {
    return Array.from(this.users.values()).map(({ ws, roomId, ...rest }) => rest);
  }

  getCards(): Card[] {
    return Array.from(this.cards.values());
  }
}

class RoomManager {
  rooms: Map<string, Room> = new Map();

  getOrCreate(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room(roomId);
      this.rooms.set(roomId, room);
    }
    return room;
  }
}

const roomManager = new RoomManager();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/rooms/:roomId/cards', (req, res) => {
  const room = roomManager.getOrCreate(req.params.roomId);
  res.json({
    cards: room.getCards(),
    users: room.getPublicUsers(),
  });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
const NAMES = ['灵感收集者', '创意先锋', '思维大师', '头脑风暴者', '点子工厂', '创新达人'];

function randomName(): string {
  return NAMES[Math.floor(Math.random() * NAMES.length)] + '-' + Math.floor(Math.random() * 1000);
}

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

wss.on('connection', (ws, req) => {
  const urlParts = req.url?.split('/').filter(Boolean) || [];
  const roomId = urlParts[urlParts.length - 1] || 'default';
  const room = roomManager.getOrCreate(roomId);
  let userId = uuidv4();
  let userName = randomName();
  let avatarColor = randomColor();

  const user: OnlineUser = {
    id: userId,
    name: userName,
    avatarColor,
    ws,
    roomId,
    editingCardId: null,
  };
  room.users.set(userId, user);

  ws.send(JSON.stringify({
    type: 'init',
    cards: room.getCards(),
    users: room.getPublicUsers(),
    selfUserId: userId,
    selfUserName: userName,
    selfAvatarColor: avatarColor,
  } as any));

  room.broadcast({
    type: 'user:join',
    user: { id: userId, name: userName, avatarColor, editingCardId: null },
  }, userId);

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'join': {
        userName = msg.userName || userName;
        avatarColor = msg.avatarColor || avatarColor;
        user.name = userName;
        user.avatarColor = avatarColor;
        room.broadcast({
          type: 'user:join',
          user: { id: userId, name: userName, avatarColor, editingCardId: null },
        }, userId);
        break;
      }
      case 'card:create': {
        const card: Card = {
          ...msg.card,
          id: msg.card.id || uuidv4(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: userId,
          votes: msg.card.votes || { up: [], down: [] },
        };
        room.cards.set(card.id, card);
        room.broadcast({ type: 'card:created', card });
        break;
      }
      case 'card:update': {
        const card = room.cards.get(msg.cardId);
        if (card) {
          const changes = { ...msg.changes, updatedAt: Date.now() };
          Object.assign(card, changes);
          room.broadcast({ type: 'card:updated', cardId: msg.cardId, changes });
        }
        break;
      }
      case 'card:delete': {
        if (room.cards.has(msg.cardId)) {
          room.cards.delete(msg.cardId);
          room.broadcast({ type: 'card:deleted', cardId: msg.cardId });
        }
        break;
      }
      case 'card:vote': {
        const card = room.cards.get(msg.cardId);
        if (card) {
          card.votes.up = card.votes.up.filter((id) => id !== userId);
          card.votes.down = card.votes.down.filter((id) => id !== userId);
          if (msg.vote === 'up') card.votes.up.push(userId);
          else if (msg.vote === 'down') card.votes.down.push(userId);
          card.updatedAt = Date.now();
          room.broadcast({ type: 'card:voted', cardId: msg.cardId, votes: card.votes });
        }
        break;
      }
      case 'cursor:move': {
        user.cursor = { x: msg.x, y: msg.y };
        room.broadcast({ type: 'cursor:moved', userId, x: msg.x, y: msg.y }, userId);
        break;
      }
      case 'card:editing': {
        user.editingCardId = msg.cardId;
        room.broadcast({ type: 'card:editing', userId, cardId: msg.cardId }, userId);
        break;
      }
      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong' } as ServerMessage));
        break;
      }
    }
  });

  ws.on('close', () => {
    room.users.delete(userId);
    room.broadcast({ type: 'user:leave', userId });
    if (room.users.size === 0) {
      roomManager.rooms.delete(roomId);
    }
  });
});

const DEFAULT_PORT = 3001;

function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      findAvailablePort(startPort + 1).then(resolve).catch(reject);
    });
  });
}

(async () => {
  const port = process.env.PORT ? parseInt(process.env.PORT) : await findAvailablePort(DEFAULT_PORT);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
})();
