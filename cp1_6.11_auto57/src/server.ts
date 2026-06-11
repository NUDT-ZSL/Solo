import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Action,
  ActionType,
  CellType,
  Hint,
  MAZE_HEIGHT,
  MAZE_WIDTH,
  MAX_HISTORY,
  MazeState,
  MessageType,
  Player,
  WebSocketMessage,
  createInitialState,
  createEmptyGrid,
  getRandomColor,
  getRandomName,
} from './shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const MAX_PLAYERS_PER_ROOM = 8;
const MESSAGE_THROTTLE_MS = 100;
const MAX_MESSAGES_PER_THROTTLE = 5;

interface Room {
  id: string;
  state: MazeState;
  clients: Map<string, WebSocket>;
  messageCounters: Map<string, { count: number; resetAt: number }>;
}

interface ExtendedWebSocket extends WebSocket {
  playerId?: string;
  roomId?: string;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getOrCreateRoom(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        state: createInitialState(),
        clients: new Map(),
        messageCounters: new Map(),
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  removeRoomIfEmpty(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && room.clients.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  addPlayerToRoom(roomId: string, playerId: string, player: Player, ws: WebSocket): boolean {
    const room = this.getOrCreateRoom(roomId);
    if (room.clients.size >= MAX_PLAYERS_PER_ROOM) {
      return false;
    }
    const existingPlayer = room.state.players.find((p) => p.id === playerId);
    if (!existingPlayer) {
      room.state.players.push(player);
    }
    room.clients.set(playerId, ws);
    return true;
  }

  removePlayerFromRoom(roomId: string, playerId: string): Player | undefined {
    const room = this.getRoom(roomId);
    if (!room) return undefined;
    room.clients.delete(playerId);
    room.messageCounters.delete(playerId);
    const playerIndex = room.state.players.findIndex((p) => p.id === playerId);
    let removedPlayer: Player | undefined;
    if (playerIndex !== -1) {
      removedPlayer = room.state.players[playerIndex];
      room.state.players.splice(playerIndex, 1);
    }
    this.removeRoomIfEmpty(roomId);
    return removedPlayer;
  }

  addHistoryAction(roomId: string, action: Action): void {
    const room = this.getRoom(roomId);
    if (!room) return;
    room.state.history.push(action);
    if (room.state.history.length > MAX_HISTORY) {
      room.state.history = room.state.history.slice(-MAX_HISTORY);
    }
  }

  checkRateLimit(roomId: string, playerId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;
    const now = Date.now();
    const counter = room.messageCounters.get(playerId);
    if (!counter || now >= counter.resetAt) {
      room.messageCounters.set(playerId, { count: 1, resetAt: now + MESSAGE_THROTTLE_MS });
      return true;
    }
    if (counter.count >= MAX_MESSAGES_PER_THROTTLE) {
      return false;
    }
    counter.count++;
    return true;
  }

  isPositionValid(roomId: string, x: number, y: number): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;
    if (x < 0 || x >= room.state.width || y < 0 || y >= room.state.height) {
      return false;
    }
    if (room.state.grid[y][x] === 'obstacle') {
      return false;
    }
    return true;
  }
}

export function broadcastToRoom(
  room: Room,
  message: WebSocketMessage,
  excludePlayerId?: string
): void {
  const data = JSON.stringify(message);
  room.clients.forEach((client, playerId) => {
    if (playerId !== excludePlayerId && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function sendToClient(ws: WebSocket, message: WebSocketMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function createAction(
  type: ActionType,
  playerId: string,
  payload: Action['payload']
): Action {
  return {
    id: uuidv4(),
    type,
    playerId,
    timestamp: Date.now(),
    payload,
  };
}

export function encodeShareData(state: MazeState): string {
  const compact = {
    g: state.grid.map((row) => row.map((c) => (c === 'obstacle' ? 1 : 0)).join('')),
    p: state.players.map((p) => ({ n: p.name, c: p.color, x: p.x, y: p.y })),
    w: state.width,
    h: state.height,
  };
  const json = JSON.stringify(compact);
  return Buffer.from(json, 'utf-8').toString('base64url');
}

export function decodeShareData(encoded: string): Partial<MazeState> | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    const compact = JSON.parse(json);
    const grid: CellType[][] = compact.g.map((row: string) =>
      row.split('').map((c: string) => (c === '1' ? 'obstacle' : 'empty'))
    );
    const players: Player[] = compact.p.map((p: any, i: number) => ({
      id: uuidv4(),
      name: p.n,
      color: p.c,
      x: p.x,
      y: p.y,
    }));
    return {
      width: compact.w || MAZE_WIDTH,
      height: compact.h || MAZE_HEIGHT,
      grid,
      players,
      hints: [],
      history: [],
    };
  } catch {
    return null;
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'dist', 'client')));

const roomManager = new RoomManager();

app.get('/api/room/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  res.json({
    roomId: req.params.id,
    playerCount: room ? room.clients.size : 0,
    exists: !!room,
  });
});

app.post('/api/save', (req, res) => {
  const { state } = req.body as { state: MazeState };
  if (!state || !state.grid) {
    res.status(400).json({ error: 'Invalid state' });
    return;
  }
  const encoded = encodeShareData(state);
  const shareUrl = `/room?data=${encodeURIComponent(encoded)}`;
  res.json({ shareUrl, data: encoded });
});

app.get('/api/load/:data', (req, res) => {
  try {
    const decoded = decodeShareData(req.params.data);
    if (!decoded) {
      res.status(400).json({ error: 'Invalid share data' });
      return;
    }
    res.json(decoded);
  } catch {
    res.status(400).json({ error: 'Failed to decode share data' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'client', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function handleJoin(ws: ExtendedWebSocket, roomId: string, data: any): void {
  const extWs = ws;
  const playerName = data?.playerName || getRandomName();
  const playerColor = data?.color || getRandomColor();
  const playerId = data?.playerId || uuidv4();

  const room = roomManager.getOrCreateRoom(roomId);

  let spawnX = Math.floor(room.state.width / 2);
  let spawnY = Math.floor(room.state.height / 2);
  let attempts = 0;
  while (
    attempts < 50 &&
    (room.state.grid[spawnY]?.[spawnX] === 'obstacle' ||
      room.state.players.some((p) => p.x === spawnX && p.y === spawnY))
  ) {
    spawnX = Math.floor(Math.random() * room.state.width);
    spawnY = Math.floor(Math.random() * room.state.height);
    attempts++;
  }

  const player: Player = {
    id: playerId,
    name: playerName,
    color: playerColor,
    x: spawnX,
    y: spawnY,
  };

  const added = roomManager.addPlayerToRoom(roomId, playerId, player, ws);
  if (!added) {
    sendToClient(ws, {
      type: 'state_sync',
      roomId,
      data: { error: '房间已满（最多8人）' },
    });
    ws.close();
    return;
  }

  extWs.playerId = playerId;
  extWs.roomId = roomId;

  sendToClient(ws, {
    type: 'state_sync',
    roomId,
    data: {
      ...room.state,
      selfPlayerId: playerId,
    },
  });

  broadcastToRoom(
    room,
    {
      type: 'join',
      roomId,
      data: player,
    },
    playerId
  );
}

function handlePlayerMove(ws: ExtendedWebSocket, roomId: string, data: any): void {
  const extWs = ws;
  const playerId = extWs.playerId;
  if (!playerId) return;

  const room = roomManager.getRoom(roomId);
  if (!room) return;

  if (!roomManager.checkRateLimit(roomId, playerId)) return;

  const newX = Math.round(data?.newX ?? -1);
  const newY = Math.round(data?.newY ?? -1);

  if (!roomManager.isPositionValid(roomId, newX, newY)) return;

  const player = room.state.players.find((p) => p.id === playerId);
  if (!player) return;

  const oldX = player.x;
  const oldY = player.y;
  player.x = newX;
  player.y = newY;

  const action = createAction('move', playerId, { newX, newY, x: oldX, y: oldY });
  roomManager.addHistoryAction(roomId, action);

  broadcastToRoom(
    room,
    {
      type: 'player_move',
      roomId,
      data: { playerId, newX, newY, oldX, oldY },
    },
    playerId
  );
}

function handleToggleObstacle(ws: ExtendedWebSocket, roomId: string, data: any): void {
  const extWs = ws;
  const playerId = extWs.playerId;
  if (!playerId) return;

  const room = roomManager.getRoom(roomId);
  if (!room) return;

  if (!roomManager.checkRateLimit(roomId, playerId)) return;

  const x = Math.round(data?.x ?? -1);
  const y = Math.round(data?.y ?? -1);

  if (x < 0 || x >= room.state.width || y < 0 || y >= room.state.height) return;

  const playerOnCell = room.state.players.some((p) => p.x === x && p.y === y);
  if (playerOnCell) return;

  const currentType = room.state.grid[y][x];
  const newType: CellType = currentType === 'empty' ? 'obstacle' : 'empty';
  room.state.grid[y][x] = newType;

  const action = createAction('toggle_obstacle', playerId, { x, y, cellType: newType });
  roomManager.addHistoryAction(roomId, action);

  broadcastToRoom(room, {
    type: 'toggle_obstacle',
    roomId,
    data: { x, y, cellType: newType },
  });
}

function handleAddHint(ws: ExtendedWebSocket, roomId: string, data: any): void {
  const extWs = ws;
  const playerId = extWs.playerId;
  if (!playerId) return;

  const room = roomManager.getRoom(roomId);
  if (!room) return;

  if (!roomManager.checkRateLimit(roomId, playerId)) return;

  const x = Math.round(data?.x ?? -1);
  const y = Math.round(data?.y ?? -1);
  const text = String(data?.text ?? '').slice(0, 100);

  if (!text || x < 0 || x >= room.state.width || y < 0 || y >= room.state.height) return;

  const hint: Hint = {
    id: uuidv4(),
    x,
    y,
    text,
    createdAt: Date.now(),
    duration: 5000,
  };

  room.state.hints.push(hint);

  const action = createAction('add_hint', playerId, { x, y, text });
  roomManager.addHistoryAction(roomId, action);

  setTimeout(() => {
    const r = roomManager.getRoom(roomId);
    if (r) {
      r.state.hints = r.state.hints.filter((h) => h.id !== hint.id);
    }
  }, hint.duration);

  broadcastToRoom(room, {
    type: 'add_hint',
    roomId,
    data: hint,
  });
}

function handleRename(ws: ExtendedWebSocket, roomId: string, data: any): void {
  const extWs = ws;
  const playerId = extWs.playerId;
  if (!playerId) return;

  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const newName = String(data?.name ?? '').slice(0, 20);
  if (!newName) return;

  const player = room.state.players.find((p) => p.id === playerId);
  if (player) {
    player.name = newName;
  }

  broadcastToRoom(room, {
    type: 'rename_player',
    roomId,
    data: { playerId, name: newName },
  });
}

function handleMessage(ws: ExtendedWebSocket, rawMessage: string): void {
  let message: WebSocketMessage;
  try {
    message = JSON.parse(rawMessage) as WebSocketMessage;
  } catch {
    return;
  }

  const { type, roomId } = message;
  if (!roomId) return;

  if (!ws.roomId) {
    if (type === 'join') {
      handleJoin(ws, roomId, message.data);
    }
    return;
  }

  if (ws.roomId !== roomId) return;

  switch (type) {
    case 'player_move':
      handlePlayerMove(ws, roomId, message.data);
      break;
    case 'toggle_obstacle':
      handleToggleObstacle(ws, roomId, message.data);
      break;
    case 'add_hint':
      handleAddHint(ws, roomId, message.data);
      break;
    case 'rename_player':
      handleRename(ws, roomId, message.data);
      break;
    default:
      break;
  }
}

wss.on('connection', (ws: ExtendedWebSocket) => {
  ws.on('message', (data) => {
    handleMessage(ws, String(data));
  });

  ws.on('close', () => {
    const roomId = ws.roomId;
    const playerId = ws.playerId;
    if (roomId && playerId) {
      const room = roomManager.getRoom(roomId);
      const removedPlayer = roomManager.removePlayerFromRoom(roomId, playerId);
      if (room && removedPlayer) {
        broadcastToRoom(room, {
          type: 'leave',
          roomId,
          data: { playerId },
        });
      }
    }
  });

  ws.on('error', () => {
    // no-op
  });
});

server.listen(PORT, () => {
  console.log(`协作迷宫服务器运行在 http://localhost:${PORT}`);
});

export { app, wss, roomManager, server };
export default server;
