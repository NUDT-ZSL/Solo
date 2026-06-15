import express, { type Request, type Response } from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import flowRouter from './routes/flow.js';

const PORT = 3001;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const userSockets = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log('Socket 连接:', socket.id);

  socket.on('join', (data: { userId: string }) => {
    const { userId } = data;
    if (!userId) return;

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);
    socket.data.userId = userId;
    console.log(`用户 ${userId} 加入, socket: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    const userId = socket.data.userId as string | undefined;
    if (userId && userSockets.has(userId)) {
      userSockets.get(userId)!.delete(socket.id);
      if (userSockets.get(userId)!.size === 0) {
        userSockets.delete(userId);
      }
    }
    console.log('Socket 断开:', socket.id);
  });
});

export function notifyUserTodoUpdate(userId: string) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  sockets.forEach((socketId) => {
    io.to(socketId).emit('new-todo', { timestamp: Date.now() });
  });
  console.log(`向用户 ${userId} 推送 todo 更新事件, socket数: ${sockets.size}`);
}

export function notifyRelevantUsers(flow: any) {
  if (!flow || !Array.isArray(flow.nodes)) return;
  const notified = new Set<string>();

  if (flow.creatorId && !notified.has(flow.creatorId)) {
    notifyUserTodoUpdate(flow.creatorId);
    notified.add(flow.creatorId);
  }

  for (const node of flow.nodes) {
    if (node.handlerId && !notified.has(node.handlerId)) {
      notifyUserTodoUpdate(node.handlerId);
      notified.add(node.handlerId);
    }
  }
}

app.use('/api', flowRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: '审批系统服务运行中', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log('========================================');
  console.log(`审批系统服务已启动`);
  console.log(`端口: ${PORT}`);
  console.log(`API地址: http://localhost:${PORT}/api`);
  console.log(`Socket.IO: http://localhost:${PORT}/socket.io`);
  console.log(`启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('========================================');
});

export { app, server, io };
