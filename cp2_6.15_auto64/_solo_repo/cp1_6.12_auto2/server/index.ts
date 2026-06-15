import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { GameEngine, Direction, GameStats } from './gameEngine.js';

export interface PlayerInfo {
  id: string;
  nickname: string;
  roomId: string;
  isReady: boolean;
  socket: Socket;
}

export interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  players: PlayerInfo[];
  status: 'waiting' | 'playing' | 'ended';
  gameEngine: GameEngine;
  gameLoopId?: NodeJS.Timeout;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  content: string;
  timestamp: number;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 3001;
const rooms: Map<string, Room> = new Map();
const playerToRoom: Map<string, string> = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

function getRoomList() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    maxPlayers: room.maxPlayers,
    players: room.players.map(p => ({ id: p.id, nickname: p.nickname, isReady: p.isReady })),
    status: room.status,
  }));
}

function broadcastRoomList() {
  io.emit('room_list', { rooms: getRoomList() });
}

function createRoom(name: string, maxPlayers: number, creator: PlayerInfo): Room {
  const roomId = uuidv4();
  const room: Room = {
    id: roomId,
    name,
    maxPlayers,
    players: [creator],
    status: 'waiting',
    gameEngine: new GameEngine(),
  };
  rooms.set(roomId, room);
  playerToRoom.set(creator.id, roomId);
  return room;
}

function joinRoom(roomId: string, player: PlayerInfo): Room | null {
  const room = rooms.get(roomId);
  if (!room || room.players.length >= room.maxPlayers || room.status !== 'waiting') {
    return null;
  }
  room.players.push(player);
  playerToRoom.set(player.id, roomId);
  return room;
}

function leaveRoom(playerId: string): void {
  const roomId = playerToRoom.get(playerId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  room.players = room.players.filter(p => p.id !== playerId);
  playerToRoom.delete(playerId);

  if (room.gameLoopId) {
    clearInterval(room.gameLoopId);
  }

  if (room.players.length === 0) {
    rooms.delete(roomId);
  } else {
    if (room.status === 'playing') {
      room.gameEngine.removeSnake(playerId);
      if (room.gameEngine.checkGameOver()) {
        endGame(room);
      }
    }
    io.to(roomId).emit('player_left', { playerId });
  }

  broadcastRoomList();
}

function startGame(room: Room): void {
  if (room.players.length < 2) return;

  room.status = 'playing';
  room.gameEngine.reset();

  room.players.forEach((player, index) => {
    room.gameEngine.addSnake(player.id, player.nickname, index);
  });

  room.gameEngine.initializeFoods(8);
  room.gameEngine.start();

  io.to(room.id).emit('game_start', { gameState: room.gameEngine.getState() });
  broadcastRoomList();

  room.gameLoopId = setInterval(() => {
    const { deadSnakes, speedBoosts } = room.gameEngine.tick();

    for (const dead of deadSnakes) {
      io.to(room.id).emit('player_dead', dead);
    }

    for (const snakeId of speedBoosts) {
      io.to(room.id).emit('speed_boost', { snakeId });
    }

    io.to(room.id).emit('game_update', { gameState: room.gameEngine.getState() });

    if (room.gameEngine.checkGameOver()) {
      endGame(room);
    }
  }, 50);
}

function endGame(room: Room): void {
  if (room.gameLoopId) {
    clearInterval(room.gameLoopId);
    room.gameLoopId = undefined;
  }

  room.status = 'ended';
  room.gameEngine.stop();

  const stats = room.gameEngine.getStats();
  io.to(room.id).emit('game_over', { stats });
  broadcastRoomList();
}

function resetRoom(room: Room): void {
  room.status = 'waiting';
  room.gameEngine.reset();
  room.players.forEach(p => {
    p.isReady = false;
  });
  broadcastRoomList();
}

io.on('connection', (socket: Socket) => {
  console.log('Player connected:', socket.id);

  let currentNickname = `Player_${socket.id.slice(0, 4)}`;
  let currentPlayer: PlayerInfo | null = null;

  socket.on('set_nickname', ({ nickname }: { nickname: string }) => {
    if (nickname && nickname.trim().length > 0 && nickname.length <= 12) {
      currentNickname = nickname.trim();
    }
  });

  socket.on('get_rooms', () => {
    socket.emit('room_list', { rooms: getRoomList() });
  });

  socket.on('create_room', ({ name, maxPlayers }: { name: string; maxPlayers: number }) => {
    const roomId = playerToRoom.get(socket.id);
    if (roomId) {
      socket.emit('error', { message: '你已经在房间中了' });
      return;
    }

    if (!name || name.trim().length === 0) {
      socket.emit('error', { message: '房间名称不能为空' });
      return;
    }

    const maxP = Math.max(2, Math.min(4, maxPlayers || 2));

    currentPlayer = {
      id: socket.id,
      nickname: currentNickname,
      roomId: '',
      isReady: true,
      socket,
    };

    const room = createRoom(name.trim(), maxP, currentPlayer);
    currentPlayer.roomId = room.id;

    socket.join(room.id);
    socket.emit('room_created', { roomId: room.id });
    io.to(room.id).emit('player_joined', { 
      player: { id: currentPlayer.id, nickname: currentPlayer.nickname, isReady: currentPlayer.isReady } 
    });
    broadcastRoomList();
  });

  socket.on('join_room', ({ roomId }: { roomId: string }) => {
    const existingRoomId = playerToRoom.get(socket.id);
    if (existingRoomId) {
      socket.emit('error', { message: '你已经在房间中了' });
      return;
    }

    currentPlayer = {
      id: socket.id,
      nickname: currentNickname,
      roomId,
      isReady: true,
      socket,
    };

    const room = joinRoom(roomId, currentPlayer);
    if (!room) {
      socket.emit('error', { message: '房间不存在或已满' });
      currentPlayer = null;
      return;
    }

    socket.join(roomId);
    socket.emit('room_joined', { 
      roomId: room.id,
      players: room.players.map(p => ({ id: p.id, nickname: p.nickname, isReady: p.isReady }))
    });
    io.to(roomId).emit('player_joined', { 
      player: { id: currentPlayer.id, nickname: currentPlayer.nickname, isReady: currentPlayer.isReady } 
    });
    broadcastRoomList();
  });

  socket.on('leave_room', () => {
    const roomId = playerToRoom.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        playerToRoom.delete(socket.id);
        
        if (room.players.length === 0) {
          if (room.gameLoopId) {
            clearInterval(room.gameLoopId);
          }
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('player_left', { playerId: socket.id });
        }
        socket.leave(roomId);
        socket.emit('room_left');
        broadcastRoomList();
      }
    }
    currentPlayer = null;
  });

  socket.on('start_game', () => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const isCreator = room.players[0]?.id === socket.id;
    if (!isCreator) {
      socket.emit('error', { message: '只有房主可以开始游戏' });
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', { message: '至少需要2名玩家才能开始' });
      return;
    }

    startGame(room);
  });

  socket.on('change_direction', ({ direction }: { direction: Direction }) => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    room.gameEngine.setDirection(socket.id, direction);
  });

  socket.on('send_chat', ({ content }: { content: string }) => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId || !content || content.trim().length === 0) return;

    const message: ChatMessage = {
      id: uuidv4(),
      playerId: socket.id,
      nickname: currentNickname,
      content: content.trim(),
      timestamp: Date.now(),
    };

    io.to(roomId).emit('chat_message', { message });
  });

  socket.on('play_again', () => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || room.status !== 'ended') return;

    const isCreator = room.players[0]?.id === socket.id;
    if (!isCreator) {
      socket.emit('error', { message: '只有房主可以开始游戏' });
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', { message: '至少需要2名玩家才能开始' });
      return;
    }

    resetRoom(room);
    setTimeout(() => startGame(room), 500);
  });

  socket.on('back_to_lobby', () => {
    const roomId = playerToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    if (room.status === 'ended') {
      resetRoom(room);
      io.to(roomId).emit('lobby_returned');
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    leaveRoom(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
