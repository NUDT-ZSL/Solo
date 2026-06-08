import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const rooms = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId)!.add(socket.id);
    const members = rooms.get(roomId)!.size;
    io.to(roomId).emit('room-users', members);
    console.log(`[join] ${socket.id} -> room ${roomId} (${members} users)`);
  });

  socket.on('draw-event', (data) => {
    socket.to(data.roomId).emit('draw-event', data);
  });

  socket.on('sticky-add', (data) => {
    socket.to(data.roomId).emit('sticky-add', data);
  });

  socket.on('sticky-move', (data) => {
    socket.to(data.roomId).emit('sticky-move', data);
  });

  socket.on('sticky-update', (data) => {
    socket.to(data.roomId).emit('sticky-update', data);
  });

  socket.on('sticky-delete', (data) => {
    socket.to(data.roomId).emit('sticky-delete', data);
  });

  socket.on('clear-canvas', (roomId: string) => {
    socket.to(roomId).emit('clear-canvas');
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        rooms.get(roomId)!.delete(socket.id);
        const members = rooms.get(roomId)!.size;
        io.to(roomId).emit('room-users', members);
        if (members === 0) {
          rooms.delete(roomId);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
  });
});

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`Whiteboard sync server running on http://localhost:${PORT}`);
});
