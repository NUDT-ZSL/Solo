import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

interface DrawEvent {
  roomId: string;
  elementId: string;
  element: any;
  userId: string;
  timestamp: number;
}

interface MoveEvent {
  roomId: string;
  elementId: string;
  x: number;
  y: number;
  rotation?: number;
  userId: string;
}

interface DeleteEvent {
  roomId: string;
  elementId: string;
  userId: string;
}

interface NoteUpdateEvent {
  roomId: string;
  elementId: string;
  text?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  rotation?: number;
  userId: string;
}

interface RoomState {
  elements: Map<string, any>;
  users: Set<string>;
}

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      elements: new Map(),
      users: new Set()
    };
    rooms.set(roomId, room);
  }
  return room;
}

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  socket.on('join-room', (data: { roomId: string; userId: string; userName: string }) => {
    const { roomId, userId } = data;
    currentRoomId = roomId;
    currentUserId = userId;

    const room = getOrCreateRoom(roomId);
    room.users.add(userId);
    socket.join(roomId);

    const existingElements = Array.from(room.elements.values());
    socket.emit('room-state', { elements: existingElements });
    socket.to(roomId).emit('user-joined', { userId, userName: data.userName });

    console.log(`User ${userId} joined room ${roomId}. Users in room: ${room.users.size}`);
  });

  socket.on('draw', (data: DrawEvent) => {
    const { roomId, elementId, element, userId } = data;
    if (!roomId) return;

    const room = getOrCreateRoom(roomId);
    room.elements.set(elementId, { ...element, id: elementId });

    socket.to(roomId).emit('draw', { elementId, element: { ...element, id: elementId }, userId });
  });

  socket.on('move-element', (data: MoveEvent) => {
    const { roomId, elementId, x, y, rotation, userId } = data;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const element = room.elements.get(elementId);
    if (element) {
      element.x = x;
      element.y = y;
      if (rotation !== undefined) element.rotation = rotation;
    }

    socket.to(roomId).emit('move-element', { elementId, x, y, rotation, userId });
  });

  socket.on('update-note', (data: NoteUpdateEvent) => {
    const { roomId, elementId, text, width, height, x, y, rotation, userId } = data;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const element = room.elements.get(elementId);
    if (element && element.type === 'sticky-note') {
      if (text !== undefined) element.text = text;
      if (width !== undefined) element.width = width;
      if (height !== undefined) element.height = height;
      if (x !== undefined) element.x = x;
      if (y !== undefined) element.y = y;
      if (rotation !== undefined) element.rotation = rotation;
    }

    socket.to(roomId).emit('update-note', { elementId, text, width, height, x, y, rotation, userId });
  });

  socket.on('delete-element', (data: DeleteEvent) => {
    const { roomId, elementId, userId } = data;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.elements.delete(elementId);
    socket.to(roomId).emit('delete-element', { elementId, userId });
  });

  socket.on('undo', (data: { roomId: string; userId: string }) => {
    socket.to(data.roomId).emit('undo', { userId: data.userId });
  });

  socket.on('redo', (data: { roomId: string; userId: string }) => {
    socket.to(data.roomId).emit('redo', { userId: data.userId });
  });

  socket.on('cursor-move', (data: { roomId: string; userId: string; x: number; y: number; color: string }) => {
    socket.to(data.roomId).emit('cursor-move', data);
  });

  socket.on('leave-room', (data: { roomId: string; userId: string }) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.users.delete(data.userId);
      socket.to(data.roomId).emit('user-left', { userId: data.userId });
      if (room.users.size === 0) {
        rooms.delete(data.roomId);
      }
    }
    socket.leave(data.roomId);
    currentRoomId = null;
  });

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.users.delete(currentUserId);
        socket.to(currentRoomId).emit('user-left', { userId: currentUserId });
        if (room.users.size === 0) {
          rooms.delete(currentRoomId);
        }
      }
    }
    console.log('User disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`CollabBoard Socket.IO server running on port ${PORT}`);
});
