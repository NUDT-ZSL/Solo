import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  GameAction,
  ClientMessage,
  ServerMessage,
  StateUpdateMessage,
  HeartbeatMessage,
  PlayerId,
} from '../src/types';
import { createInitialState, applyAction, endTurn, canPlaceTower, canUpgradeTower } from '../src/gameEngine';

const PORT = 4000;
const ROOM_TIMEOUT = 5 * 60 * 1000;
const TURN_DELAY = 1000;

interface PlayerConnection {
  ws: WebSocket;
  playerId: PlayerId | null;
  playerName: string;
  roomId: string | null;
  lastHeartbeat: number;
}

interface Room {
  id: string;
  players: Map<PlayerId, PlayerConnection>;
  state: GameState | null;
  lastActivity: number;
  turnTimeout: ReturnType<typeof setTimeout> | null;
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const waitingPlayers: PlayerConnection[] = [];
const rooms: Map<string, Room> = new Map();
const connections: Map<WebSocket, PlayerConnection> = new Map();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, waiting: waitingPlayers.length });
});

wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');
  
  const connection: PlayerConnection = {
    ws,
    playerId: null,
    playerName: '',
    roomId: null,
    lastHeartbeat: Date.now(),
  };
  
  connections.set(ws, connection);
  
  ws.on('message', (data: string) => {
    try {
      const message: ClientMessage = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });
  
  ws.on('close', () => {
    handleDisconnect(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleMessage(ws: WebSocket, message: ClientMessage): void {
  const connection = connections.get(ws);
  if (!connection) return;
  
  connection.lastHeartbeat = Date.now();
  
  switch (message.type) {
    case 'match':
      handleMatchRequest(connection, message.playerName);
      break;
    case 'action':
      handleAction(connection, message.action, message.roomId, message.playerId);
      break;
    case 'heartbeat':
      break;
  }
}

function handleMatchRequest(connection: PlayerConnection, playerName: string): void {
  console.log(`Match request from: ${playerName}`);
  
  connection.playerName = playerName;
  
  if (waitingPlayers.length > 0) {
    const opponent = waitingPlayers.shift()!;
    const roomId = uuidv4();
    
    const player1Id: PlayerId = 1;
    const player2Id: PlayerId = 2;
    
    connection.playerId = player2Id;
    connection.roomId = roomId;
    opponent.playerId = player1Id;
    opponent.roomId = roomId;
    
    const state = createInitialState(opponent.playerName, playerName);
    
    const room: Room = {
      id: roomId,
      players: new Map(),
      state,
      lastActivity: Date.now(),
      turnTimeout: null,
    };
    
    room.players.set(player1Id, opponent);
    room.players.set(player2Id, connection);
    
    rooms.set(roomId, room);
    
    sendToClient(opponent.ws, {
      type: 'matchFound',
      roomId,
      playerId: player1Id,
      opponentName: playerName,
    });
    
    sendToClient(connection.ws, {
      type: 'matchFound',
      roomId,
      playerId: player2Id,
      opponentName: opponent.playerName,
    });
    
    broadcastState(room);
    
    console.log(`Room created: ${roomId} with players: ${opponent.playerName}, ${playerName}`);
  } else {
    waitingPlayers.push(connection);
    console.log(`Player ${playerName} is waiting for match`);
  }
}

function handleAction(
  connection: PlayerConnection,
  action: GameAction,
  roomId: string,
  playerId: PlayerId
): void {
  const room = rooms.get(roomId);
  if (!room || !room.state) return;
  
  if (connection.playerId !== playerId) return;
  if (room.state.currentPlayer !== playerId) return;
  if (room.state.phase !== 'playing') return;
  
  if (!validateAction(room.state, action, playerId)) {
    console.log(`Invalid action from player ${playerId}:`, action);
    return;
  }
  
  room.lastActivity = Date.now();
  
  const newState = applyAction(room.state, action);
  room.state = newState;
  
  broadcastState(room);
  
  if (room.turnTimeout) {
    clearTimeout(room.turnTimeout);
  }
  
  room.turnTimeout = setTimeout(() => {
    if (room.state) {
      room.state = endTurn(room.state);
      broadcastState(room);
    }
  }, TURN_DELAY);
}

function validateAction(state: GameState, action: GameAction, playerId: PlayerId): boolean {
  switch (action.type) {
    case 'place':
      return canPlaceTower(state, action.coord, playerId);
    case 'upgrade':
      return canUpgradeTower(state, action.coord, playerId);
    case 'skip':
      return true;
    default:
      return false;
  }
}

function broadcastState(room: Room): void {
  if (!room.state) return;
  
  const message: StateUpdateMessage = {
    type: 'state',
    state: room.state,
  };
  
  room.players.forEach((player) => {
    sendToClient(player.ws, message);
  });
}

function sendToClient(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function handleDisconnect(ws: WebSocket): void {
  const connection = connections.get(ws);
  if (!connection) return;
  
  console.log(`Client disconnected: ${connection.playerName}`);
  
  const waitingIndex = waitingPlayers.indexOf(connection);
  if (waitingIndex !== -1) {
    waitingPlayers.splice(waitingIndex, 1);
  }
  
  if (connection.roomId) {
    const room = rooms.get(connection.roomId);
    if (room) {
      if (room.state && room.state.phase === 'playing') {
        const winner: PlayerId = connection.playerId === 1 ? 2 : 1;
        room.state.phase = 'ended';
        room.state.winner = winner;
        broadcastState(room);
      }
      
      setTimeout(() => {
        rooms.delete(room.id);
        console.log(`Room ${room.id} deleted`);
      }, 5000);
    }
  }
  
  connections.delete(ws);
}

function cleanupOldRooms(): void {
  const now = Date.now();
  
  rooms.forEach((room, roomId) => {
    if (now - room.lastActivity > ROOM_TIMEOUT) {
      console.log(`Room ${roomId} timed out`);
      
      room.players.forEach((player) => {
        if (player.ws.readyState === WebSocket.OPEN) {
          player.ws.close();
        }
      });
      
      if (room.turnTimeout) {
        clearTimeout(room.turnTimeout);
      }
      
      rooms.delete(roomId);
    }
  });
}

function checkHeartbeats(): void {
  const now = Date.now();
  const timeout = 10000;
  
  connections.forEach((connection, ws) => {
    if (now - connection.lastHeartbeat > timeout) {
      console.log(`Client heartbeat timeout: ${connection.playerName}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  });
}

setInterval(cleanupOldRooms, 60000);
setInterval(checkHeartbeats, 5000);

setInterval(() => {
  const heartbeat: HeartbeatMessage = {
    type: 'heartbeat',
    timestamp: Date.now(),
  };
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(heartbeat));
    }
  });
}, 3000);

server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
