import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { boardStore, Card, CardStatus, Priority, User } from './boardStore';

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const connectedUsers = new Map<string, User>();

function broadcastUserList(): void {
  const users = Array.from(connectedUsers.values());
  io.emit('users:update', users);
}

io.on('connection', (socket) => {
  const user = boardStore.generateUser(socket.id);
  connectedUsers.set(socket.id, user);

  socket.emit('user:assigned', user);
  broadcastUserList();

  socket.on('cards:request', () => {
    const cards = boardStore.getAll();
    socket.emit('cards:initial', cards);
  });

  socket.on('card:add', (data: {
    title: string;
    description: string;
    priority: Priority;
    status: CardStatus;
    createdBy: string;
    creatorColor: string;
  }) => {
    if (!data?.title?.trim()) return;

    try {
      const card = boardStore.addCard({
        title: data.title.trim(),
        description: data.description?.trim() || '',
        priority: data.priority || 'medium',
        status: data.status || 'todo',
        createdBy: data.createdBy || user.name,
        creatorColor: data.creatorColor || user.color,
      });

      io.emit('card:added', card);
    } catch (error) {
      console.error('Error adding card:', error);
    }
  });

  socket.on('card:update', (data: Partial<Card> & { id: string }) => {
    if (!data?.id) return;

    try {
      const updates: Partial<Omit<Card, 'id' | 'createdAt'>> = {};

      if (typeof data.title === 'string' && data.title.trim()) {
        updates.title = data.title.trim();
      }
      if (typeof data.description === 'string') {
        updates.description = data.description.trim();
      }
      if (data.priority && ['high', 'medium', 'low'].includes(data.priority)) {
        updates.priority = data.priority as Priority;
      }
      if (data.status && ['todo', 'in-progress', 'done'].includes(data.status)) {
        updates.status = data.status as CardStatus;
      }
      if (typeof data.order === 'number') {
        updates.order = data.order;
      }

      const updatedCard = boardStore.updateCard(data.id, updates);

      if (updatedCard) {
        io.emit('card:updated', updatedCard);
      }
    } catch (error) {
      console.error('Error updating card:', error);
    }
  });

  socket.on('card:delete', (data: { id: string }) => {
    if (!data?.id) return;

    try {
      const deleted = boardStore.deleteCard(data.id);
      if (deleted) {
        io.emit('card:deleted', { id: data.id });
      }
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  });

  socket.on('card:move', (data: {
    id: string;
    newStatus: CardStatus;
    newOrder: number;
  }) => {
    if (!data?.id) return;
    if (!['todo', 'in-progress', 'done'].includes(data.newStatus)) return;

    try {
      const result = boardStore.moveCard(
        data.id,
        data.newStatus as CardStatus,
        typeof data.newOrder === 'number' ? data.newOrder : 0
      );

      if (result) {
        io.emit('card:moved', {
          id: data.id,
          newStatus: data.newStatus,
          newOrder: data.newOrder,
          updatedCards: result.updatedCards,
        });
      }
    } catch (error) {
      console.error('Error moving card:', error);
    }
  });

  socket.on('disconnect', () => {
    const userData = connectedUsers.get(socket.id);
    if (userData) {
      boardStore.releaseUserName(userData.name);
      connectedUsers.delete(socket.id);
      broadcastUserList();
    }
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    connectedUsers: connectedUsers.size,
    totalCards: boardStore.getAll().length,
  });
});

app.get('/api/cards', (_req, res) => {
  res.json(boardStore.getAll());
});

app.get('/api/users', (_req, res) => {
  res.json(Array.from(connectedUsers.values()));
});

httpServer.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  需求看板服务器已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
