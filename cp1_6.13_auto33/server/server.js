import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  createRoom,
  addPlayer,
  removePlayer,
  startGame,
  initHand,
  processBet,
  isRoundComplete,
  advanceRound,
  advanceTurn,
  getPublicRoomState,
  getPlayerRoomState,
} from './gameLogic.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;

const rooms = new Map();
const clients = new Map();
let onlineCount = 0;

app.use(express.json());

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map((room) => ({
    id: room.id,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
  }));
  res.json(roomList);
});

wss.on('connection', (ws) => {
  onlineCount++;
  const clientId = uuidv4();
  clients.set(clientId, { ws, roomId: null, playerId: null, name: null });

  broadcastOnlineCount();

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(clientId, message);
    } catch (error) {
      console.error('Error parsing message:', error);
      sendToClient(clientId, { type: 'error', message: '无效的消息格式' });
    }
  });

  ws.on('close', () => {
    onlineCount--;
    const client = clients.get(clientId);
    if (client && client.roomId) {
      leaveRoom(clientId);
    }
    clients.delete(clientId);
    broadcastOnlineCount();
  });
});

function handleMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'join_lobby':
      handleJoinLobby(clientId, message);
      break;
    case 'create_room':
      handleCreateRoom(clientId, message);
      break;
    case 'join_room':
      handleJoinRoom(clientId, message);
      break;
    case 'leave_room':
      leaveRoom(clientId);
      break;
    case 'start_game':
      handleStartGame(clientId, message);
      break;
    case 'player_action':
      handlePlayerAction(clientId, message);
      break;
    case 'next_hand':
      handleNextHand(clientId, message);
      break;
    case 'get_room_list':
      sendRoomList(clientId);
      break;
    case 'get_online_count':
      sendToClient(clientId, { type: 'online_count', count: onlineCount });
      break;
    default:
      sendToClient(clientId, { type: 'error', message: '未知的消息类型' });
  }
}

function handleJoinLobby(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  const name = message.name?.trim().slice(0, 20) || '匿名玩家';
  client.name = name;

  sendRoomList(clientId);
}

function handleCreateRoom(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  if (client.roomId) {
    sendToClient(clientId, { type: 'error', message: '您已经在一个房间中' });
    return;
  }

  const room = createRoom();
  rooms.set(room.id, room);

  const playerName = message.playerName?.trim().slice(0, 20) || client.name || '匿名玩家';
  const playerId = uuidv4();

  try {
    addPlayer(room, playerName, playerId);
  } catch (error) {
    sendToClient(clientId, { type: 'error', message: error.message });
    return;
  }

  client.roomId = room.id;
  client.playerId = playerId;

  sendToClient(clientId, {
    type: 'room_state',
    room: getPlayerRoomState(room, playerId),
    playerId,
  });

  broadcastRoomUpdate(room.id);
  broadcastRoomList();
}

function handleJoinRoom(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  if (client.roomId) {
    sendToClient(clientId, { type: 'error', message: '您已经在一个房间中' });
    return;
  }

  const room = rooms.get(message.roomId);
  if (!room) {
    sendToClient(clientId, { type: 'error', message: '房间不存在' });
    return;
  }

  const playerName = message.playerName?.trim().slice(0, 20) || client.name || '匿名玩家';
  const playerId = uuidv4();

  try {
    addPlayer(room, playerName, playerId);
  } catch (error) {
    sendToClient(clientId, { type: 'error', message: error.message });
    return;
  }

  client.roomId = room.id;
  client.playerId = playerId;

  sendToClient(clientId, {
    type: 'room_state',
    room: getPlayerRoomState(room, playerId),
    playerId,
  });

  broadcastToRoom(room.id, {
    type: 'player_joined',
    player: { ...room.players.find((p) => p.id === playerId), hand: [] },
  });

  broadcastRoomUpdate(room.id);
  broadcastRoomList();
}

function leaveRoom(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) {
    client.roomId = null;
    client.playerId = null;
    return;
  }

  const playerId = client.playerId;
  removePlayer(room, playerId);

  broadcastToRoom(room.id, {
    type: 'player_left',
    playerId,
  });

  client.roomId = null;
  client.playerId = null;

  if (room.players.length === 0) {
    rooms.delete(room.id);
  } else {
    broadcastRoomUpdate(room.id);
  }

  broadcastRoomList();
}

function handleStartGame(clientId, message) {
  const client = clients.get(clientId);
  if (!client || !client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) {
    sendToClient(clientId, { type: 'error', message: '房间不存在' });
    return;
  }

  try {
    startGame(room);
  } catch (error) {
    sendToClient(clientId, { type: 'error', message: error.message });
    return;
  }

  broadcastToRoom(room.id, {
    type: 'game_started',
    room: getPublicRoomState(room),
  });

  room.players.forEach((player) => {
    const c = Array.from(clients.values()).find((cl) => cl.playerId === player.id);
    if (c) {
      sendToClient(c.ws, {
        type: 'deal_cards',
        cards: player.hand,
        playerId: player.id,
      });
      sendToClient(c.ws, {
        type: 'room_state',
        room: getPlayerRoomState(room, player.id),
        playerId: player.id,
      });
    }
  });

  const currentPlayer = room.players[room.currentPlayerIndex];
  broadcastToRoom(room.id, {
    type: 'turn_changed',
    playerId: currentPlayer.id,
  });
}

function handlePlayerAction(clientId, message) {
  const client = clients.get(clientId);
  if (!client || !client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) {
    sendToClient(clientId, { type: 'error', message: '房间不存在' });
    return;
  }

  if (room.status !== 'playing') {
    sendToClient(clientId, { type: 'error', message: '游戏未开始' });
    return;
  }

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.id !== client.playerId) {
    sendToClient(clientId, { type: 'error', message: '不是您的回合' });
    return;
  }

  const { action, amount } = message;

  try {
    processBet(room, currentPlayer, action, amount);
  } catch (error) {
    sendToClient(clientId, { type: 'error', message: error.message });
    return;
  }

  broadcastToRoom(room.id, {
    type: 'action_taken',
    playerId: client.playerId,
    action,
    amount: currentPlayer.currentBet,
  });

  if (isRoundComplete(room)) {
    const result = advanceRound(room);
    if (result.winners) {
      broadcastToRoom(room.id, {
        type: 'round_ended',
        winners: result.winners.map((w) => ({ ...w, hand: w.hand })),
        pot: result.pot,
        communityCards: room.communityCards,
      });

      const activePlayers = room.players.filter((p) => p.chips > 0);
      if (activePlayers.length < 2) {
        room.status = 'finished';
        broadcastToRoom(room.id, {
          type: 'game_ended',
          chipHistory: room.chipHistory,
        });
      }
    } else {
      broadcastToRoom(room.id, {
        type: 'community_cards',
        cards: room.communityCards,
      });
    }
  } else {
    advanceTurn(room);
  }

  room.players.forEach((player) => {
    const c = Array.from(clients.values()).find((cl) => cl.playerId === player.id);
    if (c) {
      sendToClient(c.ws, {
        type: 'room_state',
        room: getPlayerRoomState(room, player.id),
        playerId: player.id,
      });
    }
  });

  if (room.status === 'playing' && room.round !== 'showdown') {
    const nextPlayer = room.players[room.currentPlayerIndex];
    if (nextPlayer) {
      broadcastToRoom(room.id, {
        type: 'turn_changed',
        playerId: nextPlayer.id,
      });
    }
  }
}

function handleNextHand(clientId, message) {
  const client = clients.get(clientId);
  if (!client || !client.roomId) return;

  const room = rooms.get(client.roomId);
  if (!room) return;

  if (room.round !== 'showdown') {
    sendToClient(clientId, { type: 'error', message: '当前回合未结束' });
    return;
  }

  initHand(room);

  if (room.status === 'finished') {
    broadcastToRoom(room.id, {
      type: 'game_ended',
      chipHistory: room.chipHistory,
    });
    return;
  }

  broadcastToRoom(room.id, {
    type: 'new_hand',
    room: getPublicRoomState(room),
  });

  room.players.forEach((player) => {
    const c = Array.from(clients.values()).find((cl) => cl.playerId === player.id);
    if (c) {
      sendToClient(c.ws, {
        type: 'deal_cards',
        cards: player.hand,
        playerId: player.id,
      });
      sendToClient(c.ws, {
        type: 'room_state',
        room: getPlayerRoomState(room, player.id),
        playerId: player.id,
      });
    }
  });

  const currentPlayer = room.players[room.currentPlayerIndex];
  broadcastToRoom(room.id, {
    type: 'turn_changed',
    playerId: currentPlayer.id,
  });
}

function sendToClient(ws, message) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return;

  clients.forEach((client) => {
    if (client.roomId === roomId) {
      sendToClient(client.ws, message);
    }
  });
}

function broadcastRoomUpdate(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  clients.forEach((client) => {
    if (client.roomId === roomId && client.playerId) {
      sendToClient(client.ws, {
        type: 'room_state',
        room: getPlayerRoomState(room, client.playerId),
        playerId: client.playerId,
      });
    }
  });
}

function broadcastRoomList() {
  const roomList = Array.from(rooms.values()).map((room) => ({
    id: room.id,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
  }));

  clients.forEach((client) => {
    if (!client.roomId) {
      sendToClient(client.ws, {
        type: 'room_list',
        rooms: roomList,
      });
    }
  });
}

function sendRoomList(clientId) {
  const client = clients.get(clientId);
  if (!client) return;

  const roomList = Array.from(rooms.values()).map((room) => ({
    id: room.id,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status,
  }));

  sendToClient(client.ws, {
    type: 'room_list',
    rooms: roomList,
  });
}

function broadcastOnlineCount() {
  clients.forEach((client) => {
    sendToClient(client.ws, {
      type: 'online_count',
      count: onlineCount,
    });
  });
}

server.listen(PORT, () => {
  console.log(`BubblePoker server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
