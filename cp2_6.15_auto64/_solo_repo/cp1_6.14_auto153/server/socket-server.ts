import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

export enum SocketEvent {
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
  ROOM_STATE = 'room-state',
  DRAW = 'draw',
  DRAW_INCREMENTAL = 'draw-incremental',
  MOVE_ELEMENT = 'move-element',
  UPDATE_NOTE = 'update-note',
  DELETE_ELEMENT = 'delete-element',
  UNDO = 'undo',
  REDO = 'redo',
  CURSOR_MOVE = 'cursor-move',
  USER_JOINED = 'user-joined',
  USER_LEFT = 'user-left',
  SYNC_VERSION = 'sync-version',
  INCREMENTAL_UPDATE = 'incremental-update',
  RECONNECT_SYNC = 'reconnect-sync',
  OPERATION_ACK = 'operation-ack',
  CONFLICT_RESOLVED = 'conflict-resolved'
}

export interface Operation {
  opId: string;
  type: 'add' | 'update' | 'delete' | 'move' | 'note-update';
  elementId: string;
  element?: any;
  updates?: any;
  userId: string;
  version: number;
  timestamp: number;
}

interface RoomState {
  elements: Map<string, any>;
  users: Map<string, { userName: string; lastSeen: number; color: string }>;
  version: number;
  operationLog: Operation[];
  elementVersions: Map<string, number>;
}

interface DrawEvent {
  roomId: string;
  elementId: string;
  element: any;
  userId: string;
  timestamp: number;
  version?: number;
  opId?: string;
}

interface MoveEvent {
  roomId: string;
  elementId: string;
  x: number;
  y: number;
  rotation?: number;
  userId: string;
  version?: number;
  opId?: string;
}

interface DeleteEvent {
  roomId: string;
  elementId: string;
  userId: string;
  version?: number;
  opId?: string;
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
  version?: number;
  opId?: string;
}

interface IncrementalDrawEvent {
  roomId: string;
  elementId: string;
  point: { x: number; y: number };
  userId: string;
  version?: number;
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 25000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

const rooms = new Map<string, RoomState>();
const MAX_OPERATION_LOG = 500;
const MOVE_THROTTLE_MS = 16;

function generateOpId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      elements: new Map(),
      users: new Map(),
      version: 0,
      operationLog: [],
      elementVersions: new Map()
    };
    rooms.set(roomId, room);
  }
  return room;
}

function applyOperation(room: RoomState, op: Operation): boolean {
  const currentVersion = room.elementVersions.get(op.elementId) ?? 0;

  if (op.type === 'add') {
    if (room.elements.has(op.elementId)) {
      return false;
    }
    room.elements.set(op.elementId, { ...op.element, id: op.elementId, version: op.version });
    room.elementVersions.set(op.elementId, op.version);
  } else if (op.type === 'update' || op.type === 'move' || op.type === 'note-update') {
    const current = room.elements.get(op.elementId);
    if (!current) return false;

    if ((current.version ?? 0) > op.version) {
      return false;
    }

    const updated = { ...current, ...op.updates, version: op.version };
    room.elements.set(op.elementId, updated);
    room.elementVersions.set(op.elementId, op.version);
  } else if (op.type === 'delete') {
    room.elements.delete(op.elementId);
    room.elementVersions.delete(op.elementId);
  }

  room.operationLog.push(op);
  if (room.operationLog.length > MAX_OPERATION_LOG) {
    room.operationLog.shift();
  }

  room.version = Math.max(room.version, op.version);
  return true;
}

function getUserColor(userId: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const moveThrottles = new Map<string, { lastTime: number; lastData: any }>();

function throttleMove(socket: Socket, data: MoveEvent): void {
  const key = `${data.roomId}-${data.userId}-${data.elementId}`;
  const now = Date.now();
  const throttle = moveThrottles.get(key);

  if (!throttle || now - throttle.lastTime >= MOVE_THROTTLE_MS) {
    moveThrottles.set(key, { lastTime: now, lastData: data });
    broadcastMove(socket, data);
  } else {
    throttle.lastData = data;
    moveThrottles.set(key, throttle);
  }
}

function broadcastMove(socket: Socket, data: MoveEvent): void {
  const room = rooms.get(data.roomId);
  if (!room) return;

  const element = room.elements.get(data.elementId);
  if (element) {
    const updates: any = { x: data.x, y: data.y };
    if (data.rotation !== undefined) updates.rotation = data.rotation;

    const op: Operation = {
      opId: data.opId || generateOpId(),
      type: 'move',
      elementId: data.elementId,
      updates,
      userId: data.userId,
      version: (element.version ?? 0) + 1,
      timestamp: Date.now()
    };

    if (applyOperation(room, op)) {
      socket.to(data.roomId).emit(SocketEvent.MOVE_ELEMENT, {
        ...data,
        version: op.version
      });
    }
  }
}

setInterval(() => {
  for (const [key, throttle] of moveThrottles) {
    const now = Date.now();
    if (now - throttle.lastTime >= MOVE_THROTTLE_MS * 2) {
      moveThrottles.delete(key);
    }
  }
}, 1000);

const noteUpdateThrottles = new Map<string, { lastTime: number; timer: any; data: any }>();

function throttleNoteUpdate(socket: Socket, data: NoteUpdateEvent): void {
  const key = `${data.roomId}-${data.userId}-${data.elementId}`;
  const now = Date.now();
  const throttle = noteUpdateThrottles.get(key);

  if (throttle) {
    clearTimeout(throttle.timer);
    throttle.data = { ...throttle.data, ...data };
    throttle.lastTime = now;

    if (now - throttle.lastTime >= 30) {
      broadcastNoteUpdate(socket, throttle.data);
      throttle.lastTime = now;
    }

    throttle.timer = setTimeout(() => {
      const latest = noteUpdateThrottles.get(key);
      if (latest) {
        broadcastNoteUpdate(socket, latest.data);
        noteUpdateThrottles.delete(key);
      }
    }, 50);
  } else {
    broadcastNoteUpdate(socket, data);
    noteUpdateThrottles.set(key, {
      lastTime: now,
      data,
      timer: setTimeout(() => {
        noteUpdateThrottles.delete(key);
      }, 50)
    });
  }
}

function broadcastNoteUpdate(socket: Socket, data: NoteUpdateEvent): void {
  const room = rooms.get(data.roomId);
  if (!room) return;

  const element = room.elements.get(data.elementId);
  if (!element || element.type !== 'sticky-note') return;

  const updates: any = {};
  if (data.text !== undefined) updates.text = data.text;
  if (data.width !== undefined) updates.width = data.width;
  if (data.height !== undefined) updates.height = data.height;
  if (data.x !== undefined) updates.x = data.x;
  if (data.y !== undefined) updates.y = data.y;
  if (data.rotation !== undefined) updates.rotation = data.rotation;

  const op: Operation = {
    opId: data.opId || generateOpId(),
    type: 'note-update',
    elementId: data.elementId,
    updates,
    userId: data.userId,
    version: (element.version ?? 0) + 1,
    timestamp: Date.now()
  };

  if (applyOperation(room, op)) {
    socket.to(data.roomId).emit(SocketEvent.UPDATE_NOTE, {
      ...data,
      version: op.version
    });
  }
}

const cursorThrottles = new Map<string, number>();

io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;
  let isReconnecting = false;
  let lastKnownVersion = 0;

  socket.on(SocketEvent.JOIN_ROOM, (data: {
    roomId: string;
    userId: string;
    userName: string;
    lastVersion?: number;
  }) => {
    const { roomId, userId, userName, lastVersion } = data;
    currentRoomId = roomId;
    currentUserId = userId;

    const room = getOrCreateRoom(roomId);

    isReconnecting = room.users.has(userId);
    lastKnownVersion = lastVersion ?? 0;

    const userColor = getUserColor(userId);
    room.users.set(userId, {
      userName,
      lastSeen: Date.now(),
      color: userColor
    });

    socket.join(roomId);

    if (lastVersion && lastVersion < room.version && lastVersion > room.version - MAX_OPERATION_LOG) {
      const opsSince = room.operationLog.filter(op => op.version > lastVersion);
      const newElements = Array.from(room.elements.values());
      socket.emit(SocketEvent.RECONNECT_SYNC, {
        version: room.version,
        elements: newElements,
        operations: opsSince,
        users: Array.from(room.users.entries()).map(([id, info]) => ({
          userId: id,
          userName: info.userName,
          color: info.color
        }))
      });
    } else {
      const existingElements = Array.from(room.elements.values());
      socket.emit(SocketEvent.ROOM_STATE, {
        elements: existingElements,
        version: room.version,
        users: Array.from(room.users.entries()).map(([id, info]) => ({
          userId: id,
          userName: info.userName,
          color: info.color
        }))
      });
    }

    socket.to(roomId).emit(SocketEvent.USER_JOINED, {
      userId,
      userName,
      color: userColor,
      isReconnect: isReconnecting
    });

    console.log(`User ${userId} (${userName}) joined room ${roomId}. Users: ${room.users.size}`);
  });

  socket.on(SocketEvent.DRAW, (data: DrawEvent) => {
    const { roomId, elementId, element, userId } = data;
    if (!roomId || !elementId) return;

    const room = getOrCreateRoom(roomId);

    const op: Operation = {
      opId: data.opId || generateOpId(),
      type: 'add',
      elementId,
      element: { ...element, id: elementId },
      userId,
      version: room.version + 1,
      timestamp: Date.now()
    };

    if (applyOperation(room, op)) {
      socket.to(roomId).emit(SocketEvent.DRAW, {
        elementId,
        element: { ...element, id: elementId, version: op.version },
        userId,
        version: op.version,
        opId: op.opId
      });

      socket.emit(SocketEvent.OPERATION_ACK, {
        opId: op.opId,
        elementId,
        version: op.version
      });
    } else {
      socket.emit(SocketEvent.CONFLICT_RESOLVED, {
        elementId,
        serverElement: room.elements.get(elementId),
        yourVersion: data.version ?? 0,
        serverVersion: room.elementVersions.get(elementId) ?? 0
      });
    }
  });

  socket.on(SocketEvent.DRAW_INCREMENTAL, (data: IncrementalDrawEvent) => {
    const { roomId, elementId, point, userId } = data;
    if (!roomId || !elementId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const element = room.elements.get(elementId);
    if (!element || element.type !== 'brush') return;

    if (!element.points) element.points = [];
    element.points.push(point);

    socket.to(roomId).emit(SocketEvent.INCREMENTAL_UPDATE, {
      elementId,
      point,
      userId
    });
  });

  socket.on(SocketEvent.MOVE_ELEMENT, (data: MoveEvent) => {
    const { roomId, elementId, userId } = data;
    if (!roomId || !elementId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const element = room.elements.get(elementId);
    if (!element) return;

    throttleMove(socket, data);
  });

  socket.on(SocketEvent.UPDATE_NOTE, (data: NoteUpdateEvent) => {
    const { roomId, elementId, userId } = data;
    if (!roomId || !elementId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    throttleNoteUpdate(socket, data);
  });

  socket.on(SocketEvent.DELETE_ELEMENT, (data: DeleteEvent) => {
    const { roomId, elementId, userId } = data;
    if (!roomId || !elementId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const current = room.elements.get(elementId);
    if (!current) return;

    const op: Operation = {
      opId: data.opId || generateOpId(),
      type: 'delete',
      elementId,
      userId,
      version: (current.version ?? 0) + 1,
      timestamp: Date.now()
    };

    if (applyOperation(room, op)) {
      socket.to(roomId).emit(SocketEvent.DELETE_ELEMENT, {
        elementId,
        userId,
        version: op.version
      });
    }
  });

  socket.on(SocketEvent.UNDO, (data: { roomId: string; userId: string; version: number }) => {
    socket.to(data.roomId).emit(SocketEvent.UNDO, {
      userId: data.userId,
      version: data.version
    });
  });

  socket.on(SocketEvent.REDO, (data: { roomId: string; userId: string; version: number }) => {
    socket.to(data.roomId).emit(SocketEvent.REDO, {
      userId: data.userId,
      version: data.version
    });
  });

  socket.on(SocketEvent.CURSOR_MOVE, (data: {
    roomId: string;
    userId: string;
    x: number;
    y: number;
    color: string;
  }) => {
    const throttleKey = `cursor-${data.userId}`;
    const now = Date.now();
    const last = cursorThrottles.get(throttleKey);
    if (last && now - last < 30) return;
    cursorThrottles.set(throttleKey, now);

    socket.to(data.roomId).emit(SocketEvent.CURSOR_MOVE, data);

    const room = rooms.get(data.roomId);
    if (room && room.users.has(data.userId)) {
      const user = room.users.get(data.userId)!;
      user.lastSeen = now;
    }
  });

  socket.on(SocketEvent.SYNC_VERSION, (data: { roomId: string; version: number }) => {
    const room = rooms.get(data.roomId);
    if (room) {
      socket.emit(SocketEvent.SYNC_VERSION, {
        serverVersion: room.version,
        clientVersion: data.version,
        behind: room.version > data.version
      });
    }
  });

  socket.on(SocketEvent.LEAVE_ROOM, (data: { roomId: string; userId: string }) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.users.delete(data.userId);
      socket.to(data.roomId).emit(SocketEvent.USER_LEFT, { userId: data.userId });
      if (room.users.size === 0) {
        setTimeout(() => {
          const currentRoom = rooms.get(data.roomId);
          if (currentRoom && currentRoom.users.size === 0) {
            rooms.delete(data.roomId);
            console.log(`Room ${data.roomId} cleaned up`);
          }
        }, 60000);
      }
    }
    socket.leave(data.roomId);
    if (currentRoomId === data.roomId) {
      currentRoomId = null;
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const user = room.users.get(currentUserId);
        if (user) {
          setTimeout(() => {
            const currentRoom = rooms.get(currentRoomId!);
            if (currentRoom) {
              const stillGone = currentRoom.users.get(currentUserId!);
              if (stillGone && stillGone.lastSeen === user.lastSeen) {
                currentRoom.users.delete(currentUserId!);
                io.to(currentRoomId!).emit(SocketEvent.USER_LEFT, { userId: currentUserId });
                console.log(`User ${currentUserId} timed out from room ${currentRoomId}`);

                if (currentRoom.users.size === 0) {
                  setTimeout(() => {
                    const finalRoom = rooms.get(currentRoomId!);
                    if (finalRoom && finalRoom.users.size === 0) {
                      rooms.delete(currentRoomId!);
                    }
                  }, 60000);
                }
              }
            }
          }, 10000);
        }
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`CollabBoard Socket.IO server running on port ${PORT}`);
  console.log(`Events: ${Object.values(SocketEvent).join(', ')}`);
});
