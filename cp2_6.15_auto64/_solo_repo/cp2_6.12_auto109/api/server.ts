/**
 * local server entry file, for local development
 */
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { v4 as uuidv4 } from 'uuid';
import {
  getOrCreateRoom,
  saveUser,
  saveOperation,
  getOperationsByRoom,
  getOperationCount,
  clearRoomOperations,
} from './db.js';
import type { DrawOperation, User } from '../shared/types.js';
import { COLOR_PALETTE } from '../shared/types.js';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

interface RoomState {
  users: Map<string, User>;
  operationSequence: number;
  colorIndex: number;
}

const rooms = new Map<string, RoomState>();

function getOrCreateRoomState(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      users: new Map(),
      operationSequence: getOperationCount(roomId),
      colorIndex: 0,
    };
    rooms.set(roomId, room);
  }
  return room;
}

function assignColor(roomState: RoomState): string {
  const color = COLOR_PALETTE[roomState.colorIndex % COLOR_PALETTE.length];
  roomState.colorIndex++;
  return color;
}

function loadHistoryOperations(roomId: string): DrawOperation[] {
  const dbOps = getOperationsByRoom(roomId);
  return dbOps.map((op) => JSON.parse(op.operation_data) as DrawOperation);
}

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  socket.on('join', async (data: { roomId: string; nickname: string }) => {
    const { roomId, nickname } = data;

    getOrCreateRoom(roomId, roomId);

    const roomState = getOrCreateRoomState(roomId);

    const userId = uuidv4();
    const color = assignColor(roomState);

    const user: User = {
      id: userId,
      nickname: nickname || '匿名用户',
      color,
      socketId: socket.id,
    };

    roomState.users.set(userId, user);
    saveUser(userId, roomId, user.nickname, color);

    socket.join(roomId);
    currentRoomId = roomId;
    currentUserId = userId;

    const usersList = Array.from(roomState.users.values());
    socket.emit('usersList', usersList);
    socket.emit('joined', { userId, color });

    socket.to(roomId).emit('userJoined', {
      userId,
      nickname: user.nickname,
      color,
    });

    const history = loadHistoryOperations(roomId);
    socket.emit('history', { operations: history });
  });

  socket.on('operation', (data: { roomId: string; operation: DrawOperation }) => {
    const { roomId, operation } = data;
    const roomState = rooms.get(roomId);

    if (!roomState || !currentUserId) return;

    roomState.operationSequence++;

    saveOperation(
      operation.id,
      roomId,
      currentUserId,
      roomState.operationSequence,
      operation.type,
      JSON.stringify(operation)
    );

    socket.to(roomId).emit('operation', {
      operation,
      userId: currentUserId,
    });
  });

  socket.on('cursor', (data: { roomId: string; x: number; y: number; isDrawing: boolean }) => {
    const { roomId, x, y, isDrawing } = data;

    if (!currentUserId) return;

    socket.to(roomId).emit('cursor', {
      userId: currentUserId,
      x,
      y,
      isDrawing,
    });
  });

  socket.on('reaction', (data: { roomId: string; emoji: string }) => {
    const { roomId, emoji } = data;

    if (!currentUserId) return;

    io.to(roomId).emit('reaction', {
      userId: currentUserId,
      emoji,
      timestamp: Date.now(),
      duration: 1500,
    });
  });

  socket.on('undo', (data: { roomId: string }) => {
    const { roomId } = data;

    if (!currentUserId) return;

    socket.to(roomId).emit('undo', { userId: currentUserId });
  });

  socket.on('clear', (data: { roomId: string }) => {
    const { roomId } = data;
    const roomState = rooms.get(roomId);

    if (!roomState || !currentUserId) return;

    roomState.operationSequence = 0;
    clearRoomOperations(roomId);

    io.to(roomId).emit('clear', { userId: currentUserId });
  });

  socket.on('getHistory', (data: { roomId: string }) => {
    const { roomId } = data;
    const history = loadHistoryOperations(roomId);
    socket.emit('history', { operations: history });
  });

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserId) {
      const roomState = rooms.get(currentRoomId);
      if (roomState) {
        roomState.users.delete(currentUserId);
        socket.to(currentRoomId).emit('userLeft', { userId: currentUserId });

        if (roomState.users.size === 0) {
          rooms.delete(currentRoomId);
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
