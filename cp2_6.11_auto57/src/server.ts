import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  GRID_SIZE,
  MAX_HISTORY,
  CellType,
  Player,
  Hint,
  Operation,
  WSMessage,
  RoomState,
} from './types';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map<string, RoomState>();
const clientRooms = new Map<WebSocket, { roomId: string; playerId: string }>();

const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

const PLAYER_NAMES = [
  '探险家', '迷宫行者', '地图大师', '路径寻找者',
  '冒险者', '开拓者', '探索者', '导航员',
];

function createEmptyGrid(): CellType[][] {
  return Array(GRID_SIZE).fill(null).map(() =>
    Array(GRID_SIZE).fill('empty' as CellType)
  );
}

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      grid: createEmptyGrid(),
      players: new Map(),
      hints: [],
      history: [],
    };
    rooms.set(roomId, room);
  }
  return room;
}

function getRandomColor(): string {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

function getRandomName(): string {
  return PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
}

function addToHistory(room: RoomState, operation: Operation): void {
  room.history.push(operation);
  if (room.history.length > MAX_HISTORY) {
    room.history.shift();
  }
}

function broadcastToRoom(roomId: string, message: WSMessage, excludeWs?: WebSocket): void {
  const room = rooms.get(roomId);
  if (!room) return;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const clientInfo = clientRooms.get(client);
      if (clientInfo && clientInfo.roomId === roomId && client !== excludeWs) {
        client.send(JSON.stringify(message));
      }
    }
  });
}

function serializePlayers(players: Map<string, Player>): Player[] {
  return Array.from(players.values());
}

function applyOperation(room: RoomState, operation: Operation): void {
  switch (operation.type) {
    case 'move': {
      const { x, y } = operation.data.position;
      const player = room.players.get(operation.playerId);
      if (player && x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        if (room.grid[y][x] !== 'obstacle') {
          player.position = { x, y };
        }
      }
      break;
    }
    case 'toggle_obstacle': {
      const { x, y } = operation.data.position;
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        const hasPlayer = Array.from(room.players.values()).some(
          (p) => p.position.x === x && p.position.y === y
        );
        if (!hasPlayer) {
          room.grid[y][x] = room.grid[y][x] === 'empty' ? 'obstacle' : 'empty';
        }
      }
      break;
    }
    case 'add_hint': {
      const { x, y, text } = operation.data;
      const hint: Hint = {
        id: uuidv4(),
        position: { x, y },
        text,
        createdAt: Date.now(),
        duration: 5000,
      };
      room.hints.push(hint);
      break;
    }
    case 'player_update': {
      const player = room.players.get(operation.playerId);
      if (player) {
        if (operation.data.name) player.name = operation.data.name;
        if (operation.data.color) player.color = operation.data.color;
      }
      break;
    }
  }
}

function cleanExpiredHints(room: RoomState): void {
  const now = Date.now();
  room.hints = room.hints.filter((h) => now - h.createdAt < h.duration);
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room') || 'default';
  const playerId = url.searchParams.get('playerId') || uuidv4();

  const room = getOrCreateRoom(roomId);
  clientRooms.set(ws, { roomId, playerId });

  let player = room.players.get(playerId);
  if (!player) {
    let spawnX = Math.floor(Math.random() * GRID_SIZE);
    let spawnY = Math.floor(Math.random() * GRID_SIZE);
    let attempts = 0;
    while (room.grid[spawnY][spawnX] === 'obstacle' && attempts < 100) {
      spawnX = Math.floor(Math.random() * GRID_SIZE);
      spawnY = Math.floor(Math.random() * GRID_SIZE);
      attempts++;
    }

    player = {
      id: playerId,
      name: getRandomName(),
      color: getRandomColor(),
      position: { x: spawnX, y: spawnY },
    };
    room.players.set(playerId, player);

    const joinOp: Operation = {
      id: uuidv4(),
      type: 'player_join',
      playerId,
      timestamp: Date.now(),
      data: { player },
    };
    addToHistory(room, joinOp);

    broadcastToRoom(roomId, {
      type: 'operation',
      data: joinOp,
      roomId,
      playerId,
    }, ws);
  }

  cleanExpiredHints(room);

  ws.send(JSON.stringify({
    type: 'init',
    data: {
      grid: room.grid,
      players: serializePlayers(room.players),
      hints: room.hints,
      history: room.history,
      currentPlayer: player,
    },
    roomId,
    playerId,
  }));

  broadcastToRoom(roomId, {
    type: 'player_list',
    data: serializePlayers(room.players),
    roomId,
  });

  ws.on('message', (raw) => {
    try {
      const message: WSMessage = JSON.parse(raw.toString());
      const clientInfo = clientRooms.get(ws);
      if (!clientInfo) return;

      const { roomId: clientRoomId, playerId: clientPlayerId } = clientInfo;
      const room = rooms.get(clientRoomId);
      if (!room) return;

      if (message.type === 'operation') {
        const operation: Operation = {
          ...message.data,
          id: message.data.id || uuidv4(),
          playerId: clientPlayerId,
          timestamp: Date.now(),
        };

        applyOperation(room, operation);
        addToHistory(room, operation);
        cleanExpiredHints(room);

        broadcastToRoom(clientRoomId, {
          type: 'operation',
          data: operation,
          roomId: clientRoomId,
          playerId: clientPlayerId,
        }, ws);
      }

      if (message.type === 'state_sync') {
        cleanExpiredHints(room);
        ws.send(JSON.stringify({
          type: 'state_sync',
          data: {
            grid: room.grid,
            players: serializePlayers(room.players),
            hints: room.hints,
          },
          roomId: clientRoomId,
        }));
      }
    } catch (e) {
      console.error('消息处理错误:', e);
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: '无效的消息格式' },
      }));
    }
  });

  ws.on('close', () => {
    const clientInfo = clientRooms.get(ws);
    if (!clientInfo) return;

    const { roomId: clientRoomId, playerId: clientPlayerId } = clientInfo;
    const room = rooms.get(clientRoomId);

    if (room) {
      room.players.delete(clientPlayerId);

      const leaveOp: Operation = {
        id: uuidv4(),
        type: 'player_leave',
        playerId: clientPlayerId,
        timestamp: Date.now(),
        data: { playerId: clientPlayerId },
      };
      addToHistory(room, leaveOp);

      broadcastToRoom(clientRoomId, {
        type: 'operation',
        data: leaveOp,
        roomId: clientRoomId,
      });

      broadcastToRoom(clientRoomId, {
        type: 'player_list',
        data: serializePlayers(room.players),
        roomId: clientRoomId,
      });

      if (room.players.size === 0) {
        setTimeout(() => {
          const checkRoom = rooms.get(clientRoomId);
          if (checkRoom && checkRoom.players.size === 0) {
            rooms.delete(clientRoomId);
          }
        }, 60000);
      }
    }

    clientRooms.delete(ws);
  });
});

app.get('/api/room/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  res.json({
    id: room.id,
    playerCount: room.players.size,
    historyCount: room.history.length,
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`协作迷宫服务器运行在端口 ${PORT}`);
  console.log(`WebSocket路径: ws://localhost:${PORT}/ws`);
});
