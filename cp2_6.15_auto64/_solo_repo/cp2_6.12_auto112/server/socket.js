const { Server } = require('socket.io');

const PRESET_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
  '#16a085', '#c0392b', '#8e44ad', '#2980b9'
];

function getRandomColor(excludeColors = []) {
  const available = PRESET_COLORS.filter(c => !excludeColors.includes(c));
  if (available.length === 0) {
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

function setupSocket(server, dbHelpers) {
  const { updateRoomContent, getRoomContent } = dbHelpers;

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const roomUsers = new Map();
  const roomCleanupTimers = new Map();

  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

    socket.on('join-room', (data) => {
      const { roomId, userName } = data;

      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
      }

      const usersInRoom = roomUsers.get(roomId);
      const usedColors = Array.from(usersInRoom.values()).map(u => u.color);
      const userColor = getRandomColor(usedColors);

      const userData = {
        id: socket.id,
        name: userName || '匿名用户',
        color: userColor,
        cursorPosition: null
      };

      usersInRoom.set(socket.id, userData);
      socket.join(roomId);

      if (roomCleanupTimers.has(roomId)) {
        clearTimeout(roomCleanupTimers.get(roomId));
        roomCleanupTimers.delete(roomId);
      }

      const currentContent = getRoomContent(roomId);

      socket.emit('room-joined', {
        userId: socket.id,
        userColor,
        currentContent,
        users: Array.from(usersInRoom.values())
      });

      socket.to(roomId).emit('user-joined', userData);
    });

    socket.on('edit', (data) => {
      const { roomId, content } = data;

      updateRoomContent(roomId, content);

      socket.to(roomId).emit('edit-received', {
        content,
        fromUser: socket.id
      });
    });

    socket.on('cursor-move', (data) => {
      const { roomId, position } = data;

      if (roomUsers.has(roomId)) {
        const usersInRoom = roomUsers.get(roomId);
        if (usersInRoom.has(socket.id)) {
          const userData = usersInRoom.get(socket.id);
          userData.cursorPosition = position;
          usersInRoom.set(socket.id, userData);

          socket.to(roomId).emit('cursor-update', {
            userId: socket.id,
            position
          });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('用户断开:', socket.id);

      for (const [roomId, usersInRoom] of roomUsers.entries()) {
        if (usersInRoom.has(socket.id)) {
          const userData = usersInRoom.get(socket.id);
          usersInRoom.delete(socket.id);

          socket.to(roomId).emit('user-left', {
            userId: socket.id,
            userName: userData.name
          });

          if (usersInRoom.size === 0) {
            roomCleanupTimers.set(roomId, setTimeout(() => {
              roomUsers.delete(roomId);
              roomCleanupTimers.delete(roomId);
              console.log('清理房间数据:', roomId);
            }, 10000));
          }

          break;
        }
      }
    });
  });

  return io;
}

module.exports = { setupSocket };
