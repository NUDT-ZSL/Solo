import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';

interface MindMapNode {
  id: string;
  x: number;
  y: number;
  content: string;
  color: string;
  borderWidth: number;
  fontSize: number;
  lastUpdated: number;
  lastUpdatedBy: string;
}

interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  curveType: 'straight' | 'bezier';
}

interface Snapshot {
  id: string;
  timestamp: number;
  nodes: MindMapNode[];
  connections: Connection[];
}

interface RoomState {
  nodes: Record<string, MindMapNode>;
  connections: Record<string, Connection>;
  snapshots: Snapshot[];
  users: Record<string, { userId: string; nickname: string }>;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms: Record<string, RoomState> = {};
const MAX_USERS_PER_ROOM = 10;
const MAX_SNAPSHOTS = 10;
const AUTO_SAVE_INTERVAL = 60000;

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      nodes: {},
      connections: {},
      snapshots: [],
      users: {},
    };
  }
  return rooms[roomId];
}

function saveSnapshot(roomId: string, manual = false) {
  const room = getOrCreateRoom(roomId);
  const snapshot: Snapshot = {
    id: generateId(),
    timestamp: Date.now(),
    nodes: Object.values(room.nodes),
    connections: Object.values(room.connections),
  };
  room.snapshots.unshift(snapshot);
  if (room.snapshots.length > MAX_SNAPSHOTS) {
    room.snapshots.pop();
  }
  io.to(roomId).emit('snapshots:update', room.snapshots);
}

setInterval(() => {
  for (const roomId of Object.keys(rooms)) {
    const room = rooms[roomId];
    if (Object.keys(room.users).length > 0) {
      if (Object.keys(room.nodes).length > 0 || Object.keys(room.connections).length > 0) {
        saveSnapshot(roomId);
      }
    }
  }
}, AUTO_SAVE_INTERVAL);

io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;
  let currentNickname: string | null = null;

  socket.on('room:join', ({ roomId, nickname }: { roomId?: string; nickname: string }) => {
    if (!nickname || nickname.trim().length === 0) {
      socket.emit('error', '昵称不能为空');
      return;
    }

    const targetRoomId = roomId && roomId.trim().length > 0 ? roomId.toUpperCase() : generateRoomId();
    const room = getOrCreateRoom(targetRoomId);

    if (Object.keys(room.users).length >= MAX_USERS_PER_ROOM) {
      socket.emit('room:full');
      return;
    }

    const userId = socket.id;
    currentRoomId = targetRoomId;
    currentUserId = userId;
    currentNickname = nickname.trim();

    room.users[userId] = { userId, nickname: currentNickname };
    socket.join(targetRoomId);

    const userList = Object.values(room.users);
    socket.emit('room:joined', {
      roomId: targetRoomId,
      userId,
      users: userList,
      nodes: Object.values(room.nodes),
      connections: Object.values(room.connections),
      snapshots: room.snapshots,
    });
    socket.to(targetRoomId).emit('user:joined', { userId, nickname: currentNickname });
  });

  socket.on('cursor:move', ({ x, y }: { x: number; y: number }) => {
    if (currentRoomId && currentUserId && currentNickname) {
      socket.to(currentRoomId).emit('cursor:update', {
        userId: currentUserId,
        nickname: currentNickname,
        x,
        y,
      });
    }
  });

  socket.on('node:create', (nodeData: Omit<MindMapNode, 'id' | 'lastUpdated' | 'lastUpdatedBy'>) => {
    if (!currentRoomId || !currentUserId) return;
    const room = getOrCreateRoom(currentRoomId);
    const node: MindMapNode = {
      ...nodeData,
      id: generateId(),
      lastUpdated: Date.now(),
      lastUpdatedBy: currentUserId,
    };
    room.nodes[node.id] = node;
    io.to(currentRoomId).emit('node:created', node);
  });

  socket.on('node:update', (nodeData: Partial<MindMapNode> & { id: string }) => {
    if (!currentRoomId || !currentUserId) return;
    const room = getOrCreateRoom(currentRoomId);
    const existingNode = room.nodes[nodeData.id];
    if (!existingNode) return;

    let conflict = false;
    const now = Date.now();
    if (nodeData.x !== undefined || nodeData.y !== undefined) {
      if (existingNode.lastUpdatedBy !== currentUserId && now - existingNode.lastUpdated < 300) {
        conflict = true;
      }
    }

    const updatedNode: MindMapNode = {
      ...existingNode,
      ...nodeData,
      lastUpdated: now,
      lastUpdatedBy: currentUserId,
    };
    room.nodes[nodeData.id] = updatedNode;
    io.to(currentRoomId).emit('node:updated', { node: updatedNode, conflict });
  });

  socket.on('node:delete', ({ nodeId }: { nodeId: string }) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    delete room.nodes[nodeId];
    const connIds = Object.keys(room.connections).filter(
      (cid) => room.connections[cid].fromNodeId === nodeId || room.connections[cid].toNodeId === nodeId
    );
    connIds.forEach((cid) => delete room.connections[cid]);
    io.to(currentRoomId).emit('node:deleted', { nodeId, connectionIds: connIds });
  });

  socket.on('connection:create', (connData: Omit<Connection, 'id'>) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    const conn: Connection = {
      ...connData,
      id: generateId(),
    };
    room.connections[conn.id] = conn;
    io.to(currentRoomId).emit('connection:created', conn);
  });

  socket.on('connection:update', (connData: Partial<Connection> & { id: string }) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    const existing = room.connections[connData.id];
    if (!existing) return;
    const updated = { ...existing, ...connData };
    room.connections[connData.id] = updated;
    io.to(currentRoomId).emit('connection:updated', updated);
  });

  socket.on('connection:delete', ({ connectionId }: { connectionId: string }) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    delete room.connections[connectionId];
    io.to(currentRoomId).emit('connection:deleted', { connectionId });
  });

  socket.on('snapshot:save', () => {
    if (currentRoomId) {
      saveSnapshot(currentRoomId, true);
    }
  });

  socket.on('snapshot:rollback', ({ snapshotId }: { snapshotId: string }) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    const snapshot = room.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return;

    room.nodes = {};
    room.connections = {};
    snapshot.nodes.forEach((n) => {
      room.nodes[n.id] = { ...n, lastUpdated: Date.now(), lastUpdatedBy: currentUserId! };
    });
    snapshot.connections.forEach((c) => {
      room.connections[c.id] = c;
    });

    io.to(currentRoomId).emit('snapshot:rolledback', {
      nodes: Object.values(room.nodes),
      connections: Object.values(room.connections),
    });
  });

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserId) {
      const room = rooms[currentRoomId];
      if (room) {
        delete room.users[currentUserId];
        socket.to(currentRoomId).emit('user:left', { userId: currentUserId });
        if (Object.keys(room.users).length === 0 && Object.keys(room.nodes).length === 0) {
          delete rooms[currentRoomId];
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`MindMap server running on port ${PORT}`);
});
