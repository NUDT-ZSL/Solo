import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import {
  User,
  Room,
  StickyNote,
  DrawingPath,
  DEFAULT_ROOMS,
} from './shared/types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const rooms: Map<string, Room> = new Map();

DEFAULT_ROOMS.forEach((r) => {
  rooms.set(r.id, {
    id: r.id,
    name: r.name,
    users: [],
    maxUsers: r.maxUsers,
    drawings: [],
    stickies: [],
  });
});

const activePaths: Map<string, DrawingPath> = new Map();

const userColors = ['#FF3B30', '#FF9500', '#34C759', '#007AFF', '#AF52DE', '#FF2D55', '#A2845E', '#FFFFFF'];
const userNames = ['朱鹮', '玄鹤', '青鸾', '白鹭', '朱雀', '玄武', '白虎', '青龙'];

io.on('connection', (socket: Socket) => {
  let currentUser: User | null = null;

  socket.on('get-rooms', () => {
    const roomInfo = Array.from(rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      userCount: r.users.length,
      maxUsers: r.maxUsers,
    }));
    socket.emit('rooms-list', roomInfo);
  });

  socket.on('join-room', ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('room-not-found');
      return;
    }

    if (room.users.length >= room.maxUsers) {
      socket.emit('room-full');
      return;
    }

    if (currentUser && currentUser.roomId === roomId) return;

    if (currentUser) {
      const prevRoom = rooms.get(currentUser.roomId);
      if (prevRoom) {
        prevRoom.users = prevRoom.users.filter((u) => u.id !== currentUser!.id);
        io.to(currentUser.roomId).emit('user-left', { userId: currentUser.id });
        socket.leave(currentUser.roomId);
      }
    }

    const usedColors = room.users.map((u) => u.color);
    const availableColors = userColors.filter((c) => !usedColors.includes(c));
    const color = availableColors.length > 0 ? availableColors[0] : userColors[Math.floor(Math.random() * userColors.length)];
    const usedNames = room.users.map((u) => u.name);
    const availableNames = userNames.filter((n) => !usedNames.includes(n));
    const name = availableNames.length > 0 ? availableNames[0] : `用户${Math.floor(Math.random() * 1000)}`;

    currentUser = {
      id: socket.id,
      name,
      color,
      roomId,
    };

    room.users.push(currentUser);
    socket.join(roomId);

    socket.emit('room-joined', {
      roomId,
      user: currentUser,
      users: room.users,
      stickies: room.stickies,
      drawings: room.drawings,
    });

    io.to(roomId).emit('user-joined', { user: currentUser });

    const roomInfo = Array.from(rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      userCount: r.users.length,
      maxUsers: r.maxUsers,
    }));
    io.emit('rooms-list', roomInfo);
  });

  socket.on('draw-start', ({ roomId, x, y, color, size }: {
    roomId: string; x: number; y: number; color: string; size: number;
  }) => {
    if (!currentUser) return;
    const pathId = `${socket.id}-${Date.now()}`;
    const path: DrawingPath = {
      id: pathId,
      userId: currentUser.id,
      color,
      size,
      points: [{ x, y }],
    };
    activePaths.set(pathId, path);
    socket.to(roomId).emit('draw-start', {
      userId: currentUser.id,
      pathId,
      x, y, color, size,
    });
  });

  socket.on('draw-move', ({ roomId, x, y }: { roomId: string; x: number; y: number }) => {
    if (!currentUser) return;
    const pathId = Array.from(activePaths.keys()).find((k) => k.startsWith(socket.id));
    if (!pathId) return;
    const path = activePaths.get(pathId);
    if (path) {
      path.points.push({ x, y });
    }
    socket.to(roomId).emit('draw-move', {
      userId: currentUser.id,
      pathId,
      x, y,
    });
  });

  socket.on('draw-end', ({ roomId }: { roomId: string }) => {
    if (!currentUser) return;
    const pathId = Array.from(activePaths.keys()).find((k) => k.startsWith(socket.id));
    if (!pathId) return;
    const path = activePaths.get(pathId);
    if (path) {
      const room = rooms.get(roomId);
      if (room) {
        room.drawings.push(path);
      }
    }
    activePaths.delete(pathId);
    socket.to(roomId).emit('draw-end', {
      userId: currentUser.id,
      pathId,
    });
  });

  socket.on('sticky-add', ({ roomId, sticky }: { roomId: string; sticky: StickyNote }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const userStickies = room.stickies.filter((s) => s.userId === sticky.userId).length;
    if (userStickies >= 20) return;
    room.stickies.push(sticky);
    io.to(roomId).emit('sticky-added', { sticky });
  });

  socket.on('sticky-update', ({ roomId, sticky }: { roomId: string; sticky: StickyNote }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const idx = room.stickies.findIndex((s) => s.id === sticky.id);
    if (idx !== -1) {
      room.stickies[idx] = sticky;
      io.to(roomId).emit('sticky-updated', { sticky });
    }
  });

  socket.on('sticky-delete', ({ roomId, stickyId }: { roomId: string; stickyId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.stickies = room.stickies.filter((s) => s.id !== stickyId);
    io.to(roomId).emit('sticky-deleted', { stickyId });
  });

  socket.on('disconnect', () => {
    if (!currentUser) return;
    const room = rooms.get(currentUser.roomId);
    if (room) {
      room.users = room.users.filter((u) => u.id !== currentUser!.id);
      io.to(currentUser.roomId).emit('user-left', { userId: currentUser.id });
    }
    for (const [key] of activePaths) {
      if (key.startsWith(socket.id)) {
        activePaths.delete(key);
      }
    }
    currentUser = null;

    const roomInfo = Array.from(rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      userCount: r.users.length,
      maxUsers: r.maxUsers,
    }));
    io.emit('rooms-list', roomInfo);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`协作白板服务运行在端口 ${PORT}`);
});
