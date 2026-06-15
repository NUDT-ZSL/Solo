import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Shape, User, Point } from '../types';
import { initialShapes, mockUsers } from './data';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

let shapes: Shape[] = JSON.parse(JSON.stringify(initialShapes));
let users: User[] = JSON.parse(JSON.stringify(mockUsers));
let nextZIndex = shapes.length + 1;

interface DrawAction {
  shape: Shape;
  userId: string;
}

interface UpdateShapeAction {
  id: string;
  updates: Partial<Shape>;
  userId: string;
}

interface DeleteShapeAction {
  ids: string[];
  userId: string;
}

interface CursorMove {
  userId: string;
  position: Point;
}

const BROADCAST_DELAY = 100;

app.get('/api/shapes', (req, res) => {
  res.json({ shapes, nextZIndex });
});

app.get('/api/users', (req, res) => {
  res.json({ users });
});

app.post('/api/shapes', (req, res) => {
  const newShape = req.body as Shape;
  newShape.id = uuidv4();
  newShape.zIndex = nextZIndex++;
  shapes.push(newShape);
  res.json({ shape: newShape, nextZIndex });
});

io.on('connection', (socket: Socket) => {
  const userId = `user-${uuidv4().slice(0, 8)}`;
  const userName = `用户${Math.floor(Math.random() * 1000)}`;
  const userColors = ['#4fc3f7', '#ff7043', '#81c784', '#ba68c8', '#ffca28'];
  const userColor = userColors[Math.floor(Math.random() * userColors.length)];

  const newUser: User = {
    id: userId,
    name: userName,
    color: userColor,
    cursor: { x: 0, y: 0 },
    isOnline: true,
  };

  users.push(newUser);
  socket.emit('user-joined', { user: newUser, allUsers: users });
  socket.broadcast.emit('user-list-update', { users });

  socket.on('draw', (data: DrawAction) => {
    const { shape, userId: uid } = data;
    if (!shape.id) {
      shape.id = uuidv4();
      shape.zIndex = nextZIndex++;
    }
    const shapeWithOwner = { ...shape, ownerId: uid };

    const existingIndex = shapes.findIndex((s) => s.id === shape.id);
    if (existingIndex >= 0) {
      shapes[existingIndex] = shapeWithOwner;
    } else {
      shapes.push(shapeWithOwner);
    }

    setTimeout(() => {
      socket.broadcast.emit('shape-drawn', { shape: shapeWithOwner });
    }, BROADCAST_DELAY);
  });

  socket.on('update-shape', (data: UpdateShapeAction) => {
    const { id, updates, userId: uid } = data;
    const index = shapes.findIndex((s) => s.id === id);
    if (index >= 0) {
      shapes[index] = { ...shapes[index], ...updates, ownerId: uid };

      setTimeout(() => {
        socket.broadcast.emit('shape-updated', { id, updates });
      }, BROADCAST_DELAY);
    }
  });

  socket.on('batch-update', (data: { updates: UpdateShapeAction[] }) => {
    const { updates } = data;
    const remoteUpdates: { id: string; updates: Partial<Shape> }[] = [];

    updates.forEach(({ id, updates: u, userId: uid }) => {
      const index = shapes.findIndex((s) => s.id === id);
      if (index >= 0) {
        shapes[index] = { ...shapes[index], ...u, ownerId: uid };
        remoteUpdates.push({ id, updates: u });
      }
    });

    setTimeout(() => {
      socket.broadcast.emit('batch-updated', { updates: remoteUpdates });
    }, BROADCAST_DELAY);
  });

  socket.on('delete-shapes', (data: DeleteShapeAction) => {
    const { ids } = data;
    shapes = shapes.filter((s) => !ids.includes(s.id));

    setTimeout(() => {
      socket.broadcast.emit('shapes-deleted', { ids });
    }, BROADCAST_DELAY);
  });

  socket.on('clear-canvas', (data: { userId: string }) => {
    shapes = [];
    nextZIndex = 1;

    setTimeout(() => {
      socket.broadcast.emit('canvas-cleared');
    }, BROADCAST_DELAY);
  });

  socket.on('cursor-move', (data: CursorMove) => {
    const { userId: uid, position } = data;
    const user = users.find((u) => u.id === uid);
    if (user) {
      user.cursor = position;
      socket.broadcast.emit('cursor-updated', { userId: uid, position });
    }
  });

  socket.on('simulate-remote-user', (data: { userId: string }) => {
    const remoteUser = users.find((u) => u.id === data.userId);
    if (remoteUser) {
      remoteUser.isOnline = true;
      socket.broadcast.emit('user-list-update', { users });
    }
  });

  socket.on('disconnect', () => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.isOnline = false;
    }
    io.emit('user-list-update', { users });
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
  console.log(`  - API: http://localhost:${PORT}/api`);
  console.log(`  - Socket.IO: ws://localhost:${PORT}`);
});
