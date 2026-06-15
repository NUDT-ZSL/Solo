import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  name: string;
  color: string;
  avatar: string;
  socketId?: string;
}

interface BriefModuleData {
  id: string;
  title: string;
  content: string;
  type: 'headline' | 'local' | 'international' | 'finance';
}

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const defaultModules: BriefModuleData[] = [
  {
    id: uuidv4(),
    title: '今日头条',
    content: '<h2>重大新闻标题</h2><p>这里是今日头条的内容摘要...</p><ul><li>要点一</li><li>要点二</li></ul>',
    type: 'headline',
  },
  {
    id: uuidv4(),
    title: '本地新闻',
    content: '<h3>城市发展新动态</h3><p>本地区域经济持续向好发展...</p>',
    type: 'local',
  },
  {
    id: uuidv4(),
    title: '国际新闻',
    content: '<h3>全球视野</h3><p>国际要闻摘要...</p><p>更多国际动态更新中...</p>',
    type: 'international',
  },
  {
    id: uuidv4(),
    title: '财经板块',
    content: '<h3>市场概览</h3><p>今日股市行情...</p><ol><li>指数上涨</li><li>板块轮动</li></ol>',
    type: 'finance',
  },
];

let briefModules: BriefModuleData[] = [...defaultModules];
const onlineUsers = new Map<string, User>();

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('modules_updated', { modules: briefModules });

  socket.on('join', (user: User) => {
    const newUser = { ...user, socketId: socket.id };
    onlineUsers.set(socket.id, newUser);

    socket.broadcast.emit('user_joined', newUser);

    const usersList = Array.from(onlineUsers.values());
    socket.emit('users_list', usersList);

    console.log(`User joined: ${user.name}, total online: ${onlineUsers.size}`);
  });

  socket.on('reorder_modules', (data: { modules: BriefModuleData[] }) => {
    briefModules = data.modules;

    socket.broadcast.emit('modules_updated', { modules: briefModules });

    console.log('Modules reordered');
  });

  socket.on('update_module_content', (data: { moduleId: string; content: string }) => {
    const moduleIndex = briefModules.findIndex((m) => m.id === data.moduleId);
    if (moduleIndex !== -1) {
      briefModules[moduleIndex] = {
        ...briefModules[moduleIndex],
        content: data.content,
      };

      socket.broadcast.emit('module_content_updated', {
        moduleId: data.moduleId,
        content: data.content,
      });
    }
  });

  socket.on('update_module_title', (data: { moduleId: string; title: string }) => {
    const moduleIndex = briefModules.findIndex((m) => m.id === data.moduleId);
    if (moduleIndex !== -1) {
      briefModules[moduleIndex] = {
        ...briefModules[moduleIndex],
        title: data.title,
      };

      socket.broadcast.emit('module_title_updated', {
        moduleId: data.moduleId,
        title: data.title,
      });
    }
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      socket.broadcast.emit('user_left', user.id);
      console.log(`User left: ${user.name}, total online: ${onlineUsers.size}`);
    }
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', onlineUsers: onlineUsers.size });
});

app.get('/api/modules', (req, res) => {
  res.json({ modules: briefModules });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
