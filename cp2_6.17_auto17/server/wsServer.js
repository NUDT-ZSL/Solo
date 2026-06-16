const { WebSocketServer } = require('ws');

const USER_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899'
];

const DEFAULT_CODE = {
  python: 'print("Hello, World!")',
  javascript: 'console.log("Hello, World!")'
};

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  getRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        document: DEFAULT_CODE.python,
        users: new Map(),
        colorIndex: 0,
        metricsInterval: null
      });
    }
    return this.rooms.get(roomId);
  }

  getNextColor(roomId) {
    const room = this.getRoom(roomId);
    const color = USER_COLORS[room.colorIndex % USER_COLORS.length];
    room.colorIndex++;
    return color;
  }

  addUser(roomId, userId, username, role, ws) {
    const room = this.getRoom(roomId);
    const color = this.getNextColor(roomId);
    const user = {
      userId,
      username,
      role,
      color,
      connectedAt: Date.now(),
      operationCount: 0,
      cursorPosition: { row: 0, column: 0, position: 0 },
      activityHistory: [0, 0, 0, 0, 0],
      lastActivityMinute: Math.floor(Date.now() / 60000),
      ws
    };
    room.users.set(userId, user);
    return user;
  }

  removeUser(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(userId);
      if (room.users.size === 0 && room.metricsInterval) {
        clearInterval(room.metricsInterval);
        room.metricsInterval = null;
        this.rooms.delete(roomId);
      }
    }
  }

  getUsersList(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.users.values()).map(u => ({
      userId: u.userId,
      username: u.username,
      role: u.role,
      color: u.color,
      connectedAt: u.connectedAt
    }));
  }

  updateActivity(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const user = room.users.get(userId);
    if (!user) return;

    const nowMinute = Math.floor(Date.now() / 60000);
    const elapsed = nowMinute - user.lastActivityMinute;

    if (elapsed > 0) {
      for (let i = 0; i < Math.min(elapsed, 4); i++) {
        user.activityHistory.shift();
        user.activityHistory.push(0);
      }
      user.lastActivityMinute = nowMinute;
    }

    user.activityHistory[4]++;
    user.operationCount++;
  }

  applyOperation(roomId, op) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (op.type === 'insert') {
      room.document =
        room.document.slice(0, op.position) +
        op.text +
        room.document.slice(op.position);
    } else if (op.type === 'delete') {
      room.document =
        room.document.slice(0, op.position) +
        room.document.slice(op.position + (op.length || 0));
    }
  }

  updateCursor(roomId, userId, position) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const user = room.users.get(userId);
    if (!user) return;
    user.cursorPosition = position;
  }

  getStudentMetrics(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const now = Date.now();
    return Array.from(room.users.values())
      .filter(u => u.role === 'student')
      .map(u => ({
        userId: u.userId,
        username: u.username,
        connectedDuration: Math.floor((now - u.connectedAt) / 1000),
        operationCount: u.operationCount,
        cursorPosition: u.cursorPosition,
        activityHistory: [...u.activityHistory]
      }));
  }

  broadcastToRoom(roomId, message, excludeUserId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const data = JSON.stringify(message);
    room.users.forEach((user) => {
      if (user.userId !== excludeUserId && user.ws.readyState === 1) {
        user.ws.send(data);
      }
    });
  }

  sendToUser(roomId, userId, message) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const user = room.users.get(userId);
    if (user && user.ws.readyState === 1) {
      user.ws.send(JSON.stringify(message));
    }
  }

  broadcastToTeachers(roomId, message) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const data = JSON.stringify(message);
    room.users.forEach((user) => {
      if (user.role === 'teacher' && user.ws.readyState === 1) {
        user.ws.send(data);
      }
    });
  }

  hasTeacher(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return Array.from(room.users.values()).some(u => u.role === 'teacher');
  }

  startMetricsBroadcast(roomId) {
    const room = this.getRoom(roomId);
    if (room.metricsInterval) return;

    room.metricsInterval = setInterval(() => {
      if (!this.hasTeacher(roomId)) return;
      const metrics = this.getStudentMetrics(roomId);
      this.broadcastToTeachers(roomId, {
        type: 'studentMetrics',
        metrics
      });
    }, 5000);
  }
}

const roomManager = new RoomManager();

function createWsServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    let currentRoomId = null;
    let currentUserId = null;

    ws.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch (e) {
        return;
      }

      const { type, roomId } = message;

      if (type === 'join') {
        const { userId, username, role } = message;
        currentRoomId = roomId;
        currentUserId = userId;

        const user = roomManager.addUser(roomId, userId, username, role, ws);

        roomManager.sendToUser(roomId, userId, {
          type: 'init',
          document: roomManager.getRoom(roomId).document,
          users: roomManager.getUsersList(roomId),
          studentMetrics: roomManager.getStudentMetrics(roomId)
        });

        roomManager.broadcastToRoom(roomId, {
          type: 'userJoin',
          user: {
            userId: user.userId,
            username: user.username,
            role: user.role,
            color: user.color,
            connectedAt: user.connectedAt
          }
        }, userId);

        roomManager.startMetricsBroadcast(roomId);
        return;
      }

      if (!currentRoomId || !currentUserId) return;

      if (type === 'op') {
        const { op } = message;
        roomManager.applyOperation(currentRoomId, op);
        roomManager.updateActivity(currentRoomId, currentUserId);
        roomManager.broadcastToRoom(currentRoomId, {
          type: 'op',
          userId: currentUserId,
          op
        }, currentUserId);
        return;
      }

      if (type === 'cursor') {
        const cursorPosition = message.cursorPosition || message.position;
        const user = roomManager.getRoom(currentRoomId)?.users.get(currentUserId);
        if (!user) return;
        roomManager.updateCursor(currentRoomId, currentUserId, cursorPosition);
        roomManager.broadcastToRoom(currentRoomId, {
          type: 'cursor',
          userId: currentUserId,
          cursorPosition,
          color: user.color
        }, currentUserId);
        return;
      }

      if (type === 'leave') {
        handleLeave();
        return;
      }
    });

    ws.on('close', () => {
      handleLeave();
    });

    ws.on('error', () => {
      handleLeave();
    });

    function handleLeave() {
      if (!currentRoomId || !currentUserId) return;
      roomManager.broadcastToRoom(currentRoomId, {
        type: 'userLeave',
        userId: currentUserId
      });
      roomManager.removeUser(currentRoomId, currentUserId);
      currentRoomId = null;
      currentUserId = null;
    }
  });

  return wss;
}

module.exports = { createWsServer, roomManager };
