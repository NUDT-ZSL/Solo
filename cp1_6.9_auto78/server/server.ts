import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

interface MindMapNode {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  isRoot: boolean;
  createdAt: number;
}

interface MindMapEdge {
  id: string;
  from: string;
  to: string;
}

interface MindMapState {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

interface VersionSnapshot {
  id: string;
  roomId: string;
  timestamp: number;
  creatorId: string;
  creatorName: string;
  state: MindMapState;
}

interface RoomUserData {
  id: string;
  name: string;
  draggingNodeId: string | null;
}

interface RoomData {
  state: MindMapState;
  users: Map<string, RoomUserData>;
  versions: VersionSnapshot[];
  lastSnapshotTime: number;
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3001;
const VERSION_SNAPSHOT_INTERVAL = 5 * 60 * 1000;

const rooms = new Map<string, RoomData>();

const SOFT_COLORS = ['#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

app.use(express.json());

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function nodeId(): string {
  return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

function edgeId(): string {
  return 'e_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

function versionId(): string {
  return 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

function getRoom(roomId: string): RoomData {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      state: { nodes: [], edges: [] },
      users: new Map(),
      versions: [],
      lastSnapshotTime: Date.now()
    });
  }
  return rooms.get(roomId)!;
}

function randomSoftColor(): string {
  return SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
}

function createSnapshot(roomId: string, room: RoomData, creatorId: string, creatorName: string): VersionSnapshot {
  const snapshot: VersionSnapshot = {
    id: versionId(),
    roomId,
    timestamp: Date.now(),
    creatorId,
    creatorName,
    state: JSON.parse(JSON.stringify(room.state))
  };
  room.versions.push(snapshot);
  if (room.versions.length > 100) {
    room.versions = room.versions.slice(-100);
  }
  room.lastSnapshotTime = Date.now();
  return snapshot;
}

app.get('/api/versions/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = getRoom(roomId);
  const versions = room.versions
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(v => ({
      id: v.id,
      timestamp: v.timestamp,
      creatorId: v.creatorId,
      creatorName: v.creatorName
    }));
  res.json({ versions });
});

app.post('/api/rollback', (req: Request, res: Response) => {
  const { roomId, versionId: vId, userId } = req.body;
  const room = getRoom(roomId);
  const snapshot = room.versions.find(v => v.id === vId);
  if (!snapshot) {
    res.status(404).json({ error: 'Version not found' });
    return;
  }
  room.state = JSON.parse(JSON.stringify(snapshot.state));
  io.to(roomId).emit('state:update', {
    state: room.state,
    initiatorId: userId
  });
  res.json({ success: true, state: room.state });
});

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('room:join', ({ roomId, userName }: { roomId: string; userName: string }) => {
    const room = getRoom(roomId);
    socket.join(roomId);
    room.users.set(socket.id, { id: socket.id, name: userName, draggingNodeId: null });

    socket.emit('room:joined', {
      state: room.state,
      roomId,
      users: Array.from(room.users.values())
    });

    socket.to(roomId).emit('user:joined', {
      userId: socket.id,
      userName
    });

    console.log(`User ${userName} (${socket.id}) joined room ${roomId}`);
  });

  socket.on('node:create', ({ roomId, node: nodeData }: { roomId: string; node: Omit<MindMapNode, 'id' | 'createdAt'> & { id?: string } }) => {
    const room = getRoom(roomId);
    const clientTempId = nodeData.id;
    const node: MindMapNode = {
      x: nodeData.x,
      y: nodeData.y,
      text: nodeData.text,
      color: nodeData.color,
      isRoot: nodeData.isRoot,
      id: nodeId(),
      createdAt: Date.now()
    };
    room.state.nodes.push(node);

    socket.to(roomId).emit('node:created', {
      node,
      initiatorId: socket.id
    });

    socket.emit('node:created:ack', {
      node,
      clientId: clientTempId
    });
  });

  socket.on('node:move', ({ roomId, nodeId: nId, x, y }: { roomId: string; nodeId: string; x: number; y: number }) => {
    const room = getRoom(roomId);
    const node = room.state.nodes.find(n => n.id === nId);
    if (node) {
      node.x = x;
      node.y = y;
    }

    socket.to(roomId).emit('node:moved', {
      nodeId: nId,
      x,
      y,
      initiatorId: socket.id
    });
  });

  socket.on('node:drag:start', ({ roomId, nodeId: nId }: { roomId: string; nodeId: string }) => {
    const room = getRoom(roomId);
    const user = room.users.get(socket.id);
    if (user) {
      user.draggingNodeId = nId;
    }
    socket.to(roomId).emit('user:dragging', {
      userId: socket.id,
      nodeId: nId,
      userName: user?.name
    });
  });

  socket.on('node:drag:end', ({ roomId, nodeId: nId }: { roomId: string; nodeId: string }) => {
    const room = getRoom(roomId);
    const user = room.users.get(socket.id);
    if (user) {
      user.draggingNodeId = null;
    }
    socket.to(roomId).emit('user:drag:end', {
      userId: socket.id,
      nodeId: nId
    });
  });

  socket.on('node:text', ({ roomId, nodeId: nId, text }: { roomId: string; nodeId: string; text: string }) => {
    const room = getRoom(roomId);
    const node = room.state.nodes.find(n => n.id === nId);
    const finalText = text.substring(0, 50);
    if (node) {
      node.text = finalText;
    }
    socket.to(roomId).emit('node:text:updated', {
      nodeId: nId,
      text: finalText,
      initiatorId: socket.id
    });
  });

  socket.on('node:delete', ({ roomId, nodeId: nId }: { roomId: string; nodeId: string }) => {
    const room = getRoom(roomId);
    room.state.nodes = room.state.nodes.filter(n => n.id !== nId);
    room.state.edges = room.state.edges.filter(e => e.from !== nId && e.to !== nId);
    socket.to(roomId).emit('node:deleted', {
      nodeId: nId,
      initiatorId: socket.id
    });
  });

  socket.on('edge:create', ({ roomId, from, to }: { roomId: string; from: string; to: string }) => {
    const room = getRoom(roomId);
    const exists = room.state.edges.some(e =>
      (e.from === from && e.to === to) || (e.from === to && e.to === from)
    );
    if (!exists && from !== to) {
      const edge: MindMapEdge = {
        id: edgeId(),
        from,
        to
      };
      room.state.edges.push(edge);
      socket.to(roomId).emit('edge:created', {
        edge,
        initiatorId: socket.id
      });
      socket.emit('edge:created:ack', { edge });
    }
  });

  socket.on('edge:delete', ({ roomId, edgeId: eId }: { roomId: string; edgeId: string }) => {
    const room = getRoom(roomId);
    room.state.edges = room.state.edges.filter(e => e.id !== eId);
    socket.to(roomId).emit('edge:deleted', {
      edgeId: eId,
      initiatorId: socket.id
    });
  });

  socket.on('state:snapshot', ({ roomId, userId, userName }: { roomId: string; userId: string; userName: string }) => {
    const room = getRoom(roomId);
    const snapshot = createSnapshot(roomId, room, userId, userName);
    io.to(roomId).emit('version:created', {
      version: {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        creatorId: snapshot.creatorId,
        creatorName: snapshot.creatorName
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id)!;
        if (user.draggingNodeId) {
          socket.to(roomId).emit('user:drag:end', {
            userId: socket.id,
            nodeId: user.draggingNodeId
          });
        }
        room.users.delete(socket.id);
        socket.to(roomId).emit('user:left', {
          userId: socket.id,
          userName: user.name
        });
      }
    }
  });
});

setInterval(() => {
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.size > 0 &&
      Date.now() - room.lastSnapshotTime >= VERSION_SNAPSHOT_INTERVAL &&
      (room.state.nodes.length > 0 || room.state.edges.length > 0)) {
      const firstUser = Array.from(room.users.values())[0];
      if (firstUser) {
        createSnapshot(roomId, room, firstUser.id, firstUser.name);
        console.log(`Auto snapshot for room ${roomId}`);
      }
    }
  }
}, 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
