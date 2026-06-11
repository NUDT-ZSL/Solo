import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  getOrCreateRoom,
  addUserToRoom,
  removeUserFromRoom,
  getRoomUsers,
  updateRoomNodes,
  updateRoomEdges,
  getRoomState,
} from './roomManager';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: /^http:\/\/localhost:\d+$/,
    methods: ['GET', 'POST'],
  },
});

interface JoinRoomData {
  roomId: string;
  nickname: string;
}

interface CursorPosition {
  x: number;
  y: number;
}

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  socket.on('join-room', (data: JoinRoomData) => {
    const { roomId, nickname } = data;
    currentRoomId = roomId;
    currentUserId = socket.id;

    const user = addUserToRoom(roomId, socket.id, nickname);
    socket.join(roomId);

    const roomState = getRoomState(roomId);
    socket.emit('room-state', roomState);

    const users = getRoomUsers(roomId);
    io.to(roomId).emit('users-update', users);

    socket.emit('user-info', user);
  });

  socket.on('nodes-update', (nodes) => {
    if (!currentRoomId) return;
    updateRoomNodes(currentRoomId, nodes);
    socket.to(currentRoomId).emit('nodes-update', nodes);
  });

  socket.on('edges-update', (edges) => {
    if (!currentRoomId) return;
    updateRoomEdges(currentRoomId, edges);
    socket.to(currentRoomId).emit('edges-update', edges);
  });

  socket.on('cursor-move', (position: CursorPosition) => {
    if (!currentRoomId || !currentUserId) return;
    socket.to(currentRoomId).emit('cursor-move', {
      userId: currentUserId,
      position,
    });
  });

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserId) {
      removeUserFromRoom(currentRoomId, currentUserId);
      const users = getRoomUsers(currentRoomId);
      io.to(currentRoomId).emit('users-update', users);
      io.to(currentRoomId).emit('user-leave', currentUserId);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
